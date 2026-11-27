<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\FeedingLog;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class TodayService
{
    /**
     * Builds the today schedule and alert payload for one dog.
     *
     * @param Dog $dog Dog with feedingPlans.food and dogSupplements.supplement loaded.
     *
     * @return array<string, mixed>
     */
    public function forDog(Dog $dog): array
    {
        $variance  = CarbonInterval::minutes((int) config('puppertrak.reminder_variance_minutes'));
        $feedTimes = $dog->feed_times ?? [];

        /** @var Carbon|null $anchor */
        $anchor       = $dog->feed_times_set_at ?? $dog->created_at;
        $hiddenWindow = $this->resolveHiddenWindow($dog);

        /** @var Collection<int, FeedingLog> $feedingLogs */
        $feedingLogs = $dog->feedingLogs()
            ->with('food')
            ->whereBetween('fed_at', [now()->startOfDay(), now()->endOfDay()])
            ->orderBy('fed_at')
            ->get();

        $feedScheduleEntries = $this->buildFeedingScheduleFromLogs($feedTimes, $feedingLogs, $variance, $anchor, $hiddenWindow);
        $feedExtraEntries    = $this->buildFeedingExtrasFromLogs($feedTimes, $feedingLogs);

        $feedingMissed = collect($feedScheduleEntries)->contains('status', 'overdue');

        $supplementResult = $this->buildSupplementData($dog, $variance, $hiddenWindow);

        $recentHours     = (int) config('puppertrak.health_note_recent_hours');
        $healthNoteCount = $dog->healthNotes()
            ->where('occurred_at', '>=', now()->subHours($recentHours))
            ->count();

        /** @var Carbon|null $archivedAt */
        $archivedAt = $dog->archived_at;

        /** @var Carbon|null $hiddenAt */
        $hiddenAt = $dog->hidden_at;

        return [
            'dog' => [
                'id'                   => $dog->id,
                'slug'                 => $dog->slug,
                'name'                 => $dog->name,
                'breed'                => $dog->breed,
                'weight'               => $dog->weight,
                'weight_unit'          => $dog->weight_unit,
                'feeding_instructions' => $dog->feeding_instructions,
                'archived_at'          => $archivedAt?->toIso8601String(),
                'hidden_at'            => $hiddenAt?->toIso8601String(),
            ],
            'feedings' => [
                'schedule' => $feedScheduleEntries,
                'extras'   => $feedExtraEntries,
            ],
            'supplements' => $supplementResult,
            'alerts'      => [
                'feeding_missed'      => $feedingMissed,
                'supplements_overdue' => $supplementResult['overdue'] > 0,
            ],
            'health_notes_last_24h' => $healthNoteCount,
        ];
    }

    /**
     * Builds the dashboard payload for all active, visible dogs.
     *
     * @return array<int, array<string, mixed>>
     */
    public function forAllDogs(): array
    {
        $dogs = Dog::active()->visible()
            ->with(['feedingPlans.food', 'dogSupplements.supplement'])
            ->get();

        return $dogs->map(fn (Dog $dog): array => $this->forDog($dog))->values()->all();
    }

    /**
     * Greedy nearest-first match: each log claims the nearest unsatisfied time
     * whose variance window contains it (ties go to the earlier time); unmatched
     * logs become extras.
     *
     * @template TLog of Model
     *
     * @param array<int, string>    $times    Scheduled HH:MM strings.
     * @param Collection<int, TLog> $logs     Today's logs, ordered by timestamp.
     * @param string                $column   Timestamp attribute on the log model.
     * @param CarbonInterval        $variance Window half-width.
     *
     * @return array{0: array<int, array{at: Carbon, log: TLog|null}>, 1: list<TLog>}
     */
    protected function matchToWindows(array $times, Collection $logs, string $column, CarbonInterval $variance): array
    {
        /** @var array<int, array{at: Carbon, log: Model|null}> $schedule */
        $schedule = collect($times)->sort()->values()->map(fn (string $time): array => [
            'at'  => Carbon::parse('today ' . $time),
            'log' => null,
        ])->all();

        /** @var list<Model> $extras */
        $extras = [];

        foreach ($logs as $log) {
            /** @var Carbon $timestamp */
            $timestamp = $log->{$column};

            $candidates = collect($schedule)
                ->filter(fn (array $entry): bool => $entry['log'] === null
                    && $timestamp->between(
                        $entry['at']->copy()->sub($variance),
                        $entry['at']->copy()->add($variance),
                    ))
                ->sortBy(fn (array $entry) => [
                    abs($timestamp->diffInSeconds($entry['at'])),
                    $entry['at']->getTimestamp(),
                ]);

            $key = $candidates->keys()->first();

            if ($key === null) {
                $extras[] = $log;
            } else {
                $schedule[$key]['log'] = $log;
            }
        }

        return [$schedule, $extras];
    }

    /**
     * Today's stretch during which the dog was hidden, so slots inside it are
     * not flagged while slots missed before hiding keep their alerts. A pause
     * that began before today counts from midnight.
     *
     * @param Dog $dog
     *
     * @return array{0: Carbon, 1: Carbon}|null
     */
    private function resolveHiddenWindow(Dog $dog): ?array
    {
        /** @var Carbon|null $resumedAt */
        $resumedAt = $dog->tracking_resumed_at;

        if ($resumedAt === null || ! $resumedAt->isToday()) {
            return null;
        }

        /** @var Carbon|null $pausedAt */
        $pausedAt = $dog->tracking_paused_at;

        $start = $pausedAt !== null && $pausedAt->isToday() ? $pausedAt : now()->startOfDay();

        return [$start, $resumedAt];
    }

    /**
     * @param Carbon                           $at           Scheduled time today.
     * @param array{0: Carbon, 1: Carbon}|null $hiddenWindow Today's hidden stretch, if any.
     *
     * @return boolean
     */
    private function isInHiddenWindow(Carbon $at, ?array $hiddenWindow): bool
    {
        return $hiddenWindow !== null && $at->between($hiddenWindow[0], $hiddenWindow[1]);
    }

    /**
     * Builds schedule entries by grouping today's logs on their stored
     * feed_time rather than inferring slot ownership from a variance window.
     *
     * @param array<int, string>               $feedTimes    Scheduled HH:MM strings from the dog.
     * @param Collection<int, FeedingLog>      $logs         Today's feeding logs, ordered by fed_at.
     * @param CarbonInterval                   $variance     Window half-width for overdue threshold.
     * @param Carbon|null                      $anchor       Feed-time anchor; pre-anchor same-day slots are untracked.
     * @param array{0: Carbon, 1: Carbon}|null $hiddenWindow Today's hidden stretch; slots inside it are untracked.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildFeedingScheduleFromLogs(array $feedTimes, Collection $logs, CarbonInterval $variance, ?Carbon $anchor, ?array $hiddenWindow): array
    {
        $sorted     = collect($feedTimes)->sort()->values();
        $logsByTime = $logs->whereIn('feed_time', $sorted->all())->groupBy('feed_time');

        $entries = [];

        foreach ($sorted as $time) {
            /** @var Collection<int, FeedingLog> $slotLogs */
            $slotLogs = $logsByTime->get($time, new Collection);
            $at       = Carbon::parse('today ' . $time);

            $untracked = ($anchor !== null && $at->lt($anchor) && $at->isSameDay($anchor))
                || $this->isInHiddenWindow($at, $hiddenWindow);

            $entries[] = [
                'time'   => $time,
                'status' => $this->deriveFeedingStatusFromLogs($slotLogs, $at, $variance, $untracked),
                'logs'   => $slotLogs->values()->map(fn (FeedingLog $log): array => [
                    'log_id'      => $log->id,
                    'logged_at'   => $this->formatTimestamp($log->fed_at),
                    'amount'      => $log->amount,
                    'unit'        => $log->unit,
                    'food_name'   => $log->food?->name,
                    'skip_reason' => $log->skip_reason,
                    'was_skipped' => $log->was_skipped,
                ])->all(),
            ];
        }

        return $entries;
    }

    /**
     * Logs with a null feed_time or a feed_time no longer present in the
     * dog's current schedule are extras.
     *
     * @param array<int, string>          $feedTimes Current scheduled HH:MM strings.
     * @param Collection<int, FeedingLog> $logs      Today's feeding logs.
     *
     * @return list<array<string, mixed>>
     */
    private function buildFeedingExtrasFromLogs(array $feedTimes, Collection $logs): array
    {
        $extras = $logs->filter(
            fn (FeedingLog $log): bool => $log->feed_time === null || ! in_array($log->feed_time, $feedTimes, true),
        );

        $entries = [];

        foreach ($extras as $log) {
            $entries[] = [
                'log_id'    => $log->id,
                'food_name' => $log->food?->name,
                'amount'    => $log->amount,
                'unit'      => $log->unit,
                'status'    => ($log->was_skipped || (float) $log->amount === 0.0) ? 'skipped' : 'fed',
                'logged_at' => $this->formatTimestamp($log->fed_at),
            ];
        }

        return $entries;
    }

    /**
     * @param Collection<int, FeedingLog> $logs      Logs assigned to this slot.
     * @param Carbon                      $at        Scheduled time.
     * @param CarbonInterval              $variance  Window half-width for overdue threshold.
     * @param boolean                     $untracked Whether this slot fell outside tracked time today.
     *
     * @return string
     */
    private function deriveFeedingStatusFromLogs(Collection $logs, Carbon $at, CarbonInterval $variance, bool $untracked = false): string
    {
        if ($logs->isNotEmpty()) {
            $hasFed = $logs->contains(fn (FeedingLog $log): bool => ! $log->was_skipped && (float) $log->amount !== 0.0);

            return $hasFed ? 'fed' : 'skipped';
        }

        if ($untracked) {
            return 'untracked';
        }

        return now()->gt($at->copy()->add($variance)) ? 'overdue' : 'upcoming';
    }

    /**
     * Filters times to those a supplement assignment can be judged against, so
     * it is never flagged for times that closed before it existed or while the
     * dog was hidden.
     *
     * @param array<int, string>               $times        Scheduled HH:MM strings.
     * @param Carbon|null                      $after        Threshold datetime; times before it are excluded.
     * @param array{0: Carbon, 1: Carbon}|null $hiddenWindow Today's hidden stretch; times inside it are excluded.
     *
     * @return array<int, string>
     */
    private function eligibleTimes(array $times, ?Carbon $after, ?array $hiddenWindow): array
    {
        return array_values(array_filter(
            $times,
            function (string $time) use ($after, $hiddenWindow): bool {
                $at = Carbon::parse('today ' . $time);

                return ($after === null || $at->gte($after)) && ! $this->isInHiddenWindow($at, $hiddenWindow);
            },
        ));
    }

    /**
     * Builds scheduled and as-needed supplement entries with aggregate counts.
     *
     * @param Dog                              $dog          Dog with dogSupplements.supplement loaded.
     * @param CarbonInterval                   $variance     Window half-width.
     * @param array{0: Carbon, 1: Carbon}|null $hiddenWindow Today's hidden stretch, if any.
     *
     * @return array<string, mixed>
     */
    private function buildSupplementData(Dog $dog, CarbonInterval $variance, ?array $hiddenWindow): array
    {
        $allSupplementLogs = $dog->supplementLogs()
            ->whereBetween('given_at', [now()->startOfDay(), now()->endOfDay()])
            ->orderBy('given_at')
            ->get();

        $scheduledEntries = [];
        $asNeededEntries  = [];
        $totalExpected    = 0;
        $totalHandled     = 0;
        $totalOverdue     = 0;

        foreach ($dog->dogSupplements as $assignment) {
            /** @var Collection<int, SupplementLog> $assignmentLogs */
            $assignmentLogs = $allSupplementLogs->where('dog_supplement_id', $assignment->id)->values();

            $frequency = $assignment->frequency ?? 'as_needed';

            if ($frequency === 'as_needed') {
                $asNeededEntries[] = $this->buildAsNeededEntry($assignment, $assignmentLogs);
                continue;
            }

            if (! $this->isDueDay($assignment)) {
                // A dose given on an off day still shows, but the day expects nothing.
                if ($assignmentLogs->isNotEmpty()) {
                    $scheduledEntries[] = $this->buildUntimedScheduleEntry($assignment, $assignmentLogs);
                }

                continue;
            }

            /** @var array<int, string> $times */
            $times = $assignment->times ?? [];

            if (count($times) === 0) {
                $totalExpected++;
                $untimedResult      = $this->buildUntimedScheduleEntry($assignment, $assignmentLogs);
                $scheduledEntries[] = $untimedResult;

                if ($untimedResult['status'] === 'fed' || $untimedResult['status'] === 'skipped') {
                    $totalHandled++;
                }

                continue;
            }

            /** @var Carbon|null $assignmentCreatedAt */
            $assignmentCreatedAt = $assignment->created_at;

            $eligibleTimes = $this->eligibleTimes($times, $assignmentCreatedAt, $hiddenWindow);

            $totalExpected += count($eligibleTimes);

            // Ineligible slots stay out of matching so they cannot claim a dose
            // that belongs to a later eligible slot.
            [$timeSchedule, $leftoverLogs] = $this->matchToWindows($eligibleTimes, $assignmentLogs, 'given_at', $variance);

            foreach (array_diff($times, $eligibleTimes) as $time) {
                $timeSchedule[] = ['at' => Carbon::parse('today ' . $time), 'log' => null];
            }

            usort($timeSchedule, fn (array $a, array $b): int => $a['at'] <=> $b['at']);

            [$timeSchedule, $unplacedLogs] = $this->claimOpenSlots($timeSchedule, $leftoverLogs);

            foreach ($timeSchedule as $entry) {
                /** @var SupplementLog|null $log */
                $log      = $entry['log'];
                $at       = $entry['at'];
                $eligible = in_array($at->format('H:i'), $eligibleTimes, true);

                // A dose given against an untracked slot makes that slot count,
                // so handled never exceeds expected.
                if (! $eligible && $log !== null) {
                    $totalExpected++;
                }

                $status = $eligible || $log !== null
                    ? $this->deriveSupplementStatus($log, $at, $variance)
                    : 'untracked';

                if ($status === 'fed' || $status === 'skipped') {
                    $totalHandled++;
                }

                if ($status === 'overdue') {
                    $totalOverdue++;
                }

                $scheduledEntries[] = [
                    'dog_supplement_id' => $assignment->id,
                    'supplement_name'   => $assignment->supplement?->name,
                    'dose'              => $assignment->dose,
                    'unit'              => $assignment->unit,
                    'time'              => $at->format('H:i'),
                    'status'            => $status,
                    'log_id'            => $log?->id,
                    'logged_at'         => $this->formatTimestamp($log?->given_at),
                    'skip_reason'       => $log?->skip_reason,
                ];
            }

            foreach ($unplacedLogs as $log) {
                $scheduledEntries[] = $this->buildUntimedScheduleEntry($assignment, new Collection([$log]));
            }
        }

        return [
            'expected'  => $totalExpected,
            'handled'   => $totalHandled,
            'overdue'   => $totalOverdue,
            'schedule'  => $scheduledEntries,
            'as_needed' => $asNeededEntries,
        ];
    }

    /**
     * Places doses that missed every reminder window on a slot still open, so
     * no dose given today drops off the view. Each takes the latest open slot
     * at or before it, otherwise the earliest open slot after it.
     *
     * @param array<int, array{at: Carbon, log: SupplementLog|null}> $schedule Slots sorted by time.
     * @param list<SupplementLog>                                    $logs     Unmatched logs, ordered by given_at.
     *
     * @return array{0: array<int, array{at: Carbon, log: SupplementLog|null}>, 1: list<SupplementLog>}
     */
    private function claimOpenSlots(array $schedule, array $logs): array
    {
        $unplaced = [];

        foreach ($logs as $log) {
            /** @var Carbon $givenAt */
            $givenAt = $log->given_at;

            $open    = array_filter($schedule, fn (array $entry): bool => $entry['log'] === null);
            $earlier = array_filter($open, fn (array $entry): bool => $entry['at']->lte($givenAt));
            $key     = $earlier !== [] ? array_key_last($earlier) : array_key_first($open);

            if ($key === null) {
                $unplaced[] = $log;
            } else {
                $schedule[$key]['log'] = $log;
            }
        }

        return [$schedule, $unplaced];
    }

    /**
     * Whether today is a due day for a given assignment based on its frequency.
     *
     * @param DogSupplement $assignment
     *
     * @return boolean
     */
    private function isDueDay(DogSupplement $assignment): bool
    {
        $frequency = $assignment->frequency ?? 'as_needed';

        if ($frequency === 'daily') {
            return true;
        }

        if ($frequency !== 'interval') {
            return false;
        }

        /** @var Carbon|null $startDate */
        $startDate = $assignment->start_date;

        if ($startDate === null) {
            return false;
        }

        $intervalDays = $assignment->interval_days;

        if ($intervalDays === null || $intervalDays < 1) {
            return false;
        }

        $today    = now()->startOfDay();
        $start    = $startDate->copy()->startOfDay();
        $daysDiff = (int) $start->diffInDays($today, false);

        if ($daysDiff < 0) {
            return false;
        }

        return $daysDiff % $intervalDays === 0;
    }

    /**
     * Builds a schedule entry for an assignment without specific times.
     * These are due all day and never overdue.
     *
     * @param DogSupplement                  $assignment
     * @param Collection<int, SupplementLog> $logs       Today's logs for this assignment.
     *
     * @return array<string, mixed>
     */
    private function buildUntimedScheduleEntry(DogSupplement $assignment, Collection $logs): array
    {
        /** @var SupplementLog|null $log */
        $log = $logs->first();

        $status = 'due';

        if ($log !== null) {
            $status = ($log->was_skipped || (float) $log->amount_given === 0.0) ? 'skipped' : 'fed';
        }

        return [
            'dog_supplement_id' => $assignment->id,
            'supplement_name'   => $assignment->supplement?->name,
            'dose'              => $assignment->dose,
            'unit'              => $assignment->unit,
            'time'              => null,
            'status'            => $status,
            'log_id'            => $log?->id,
            'logged_at'         => $this->formatTimestamp($log?->given_at),
            'skip_reason'       => $log?->skip_reason,
        ];
    }

    /**
     * @param DogSupplement                  $assignment The as-needed assignment.
     * @param Collection<int, SupplementLog> $logs       Today's logs for this assignment.
     *
     * @return array<string, mixed>
     */
    private function buildAsNeededEntry(DogSupplement $assignment, Collection $logs): array
    {
        $logEntries = [];

        foreach ($logs as $log) {
            $logEntries[] = [
                'log_id'    => $log->id,
                'amount'    => $log->amount_given,
                'unit'      => $log->unit,
                'logged_at' => $this->formatTimestamp($log->given_at),
            ];
        }

        return [
            'dog_supplement_id' => $assignment->id,
            'supplement_name'   => $assignment->supplement?->name,
            'dose'              => $assignment->dose,
            'unit'              => $assignment->unit,
            'logs_today'        => $logEntries,
        ];
    }

    /**
     * Larastan infers datetime-cast attributes as string; this helper
     * accepts the mixed value and formats it safely.
     *
     * @param mixed $value A Carbon instance or null from a datetime cast.
     *
     * @return string|null
     */
    private function formatTimestamp(mixed $value): ?string
    {
        return $value instanceof Carbon ? $value->toIso8601String() : null;
    }

    /**
     * @param SupplementLog|null $log      Matched log or null.
     * @param Carbon             $at       Scheduled time.
     * @param CarbonInterval     $variance Window half-width.
     *
     * @return string
     */
    private function deriveSupplementStatus(?SupplementLog $log, Carbon $at, CarbonInterval $variance): string
    {
        if ($log !== null) {
            return ($log->was_skipped || (float) $log->amount_given === 0.0) ? 'skipped' : 'fed';
        }

        return now()->gt($at->copy()->add($variance)) ? 'overdue' : 'upcoming';
    }
}
