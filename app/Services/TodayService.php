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
        $anchor = $dog->feed_times_set_at ?? $dog->created_at;

        /** @var Collection<int, FeedingLog> $feedingLogs */
        $feedingLogs = $dog->feedingLogs()
            ->with('food')
            ->whereBetween('fed_at', [now()->startOfDay(), now()->endOfDay()])
            ->orderBy('fed_at')
            ->get();

        $feedScheduleEntries = $this->buildFeedingScheduleFromLogs($feedTimes, $feedingLogs, $variance, $anchor);
        $feedExtraEntries    = $this->buildFeedingExtrasFromLogs($feedTimes, $feedingLogs);

        $feedingMissed = collect($feedScheduleEntries)->contains('status', 'overdue');

        $supplementResult = $this->buildSupplementData($dog, $variance);

        $recentHours     = (int) config('puppertrak.health_note_recent_hours');
        $healthNoteCount = $dog->healthNotes()
            ->where('occurred_at', '>=', now()->subHours($recentHours))
            ->count();

        /** @var Carbon|null $archivedAt */
        $archivedAt = $dog->archived_at;

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
     * Builds the dashboard payload for all active dogs.
     *
     * @return array<int, array<string, mixed>>
     */
    public function forAllDogs(): array
    {
        $dogs = Dog::active()
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
     * Builds schedule entries by grouping today's logs on their stored
     * feed_time rather than inferring slot ownership from a variance window.
     *
     * @param array<int, string>          $feedTimes Scheduled HH:MM strings from the dog.
     * @param Collection<int, FeedingLog> $logs      Today's feeding logs, ordered by fed_at.
     * @param CarbonInterval              $variance  Window half-width for overdue threshold.
     * @param Carbon|null                 $anchor    Feed-time anchor; pre-anchor same-day slots are untracked.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildFeedingScheduleFromLogs(array $feedTimes, Collection $logs, CarbonInterval $variance, ?Carbon $anchor): array
    {
        $sorted     = collect($feedTimes)->sort()->values();
        $logsByTime = $logs->whereIn('feed_time', $sorted->all())->groupBy('feed_time');

        $entries = [];

        foreach ($sorted as $time) {
            /** @var Collection<int, FeedingLog> $slotLogs */
            $slotLogs = $logsByTime->get($time, new Collection);
            $at       = Carbon::parse('today ' . $time);

            $preAnchorSameDay = $anchor !== null
                && $at->lt($anchor)
                && $at->isSameDay($anchor);

            $entries[] = [
                'time'   => $time,
                'status' => $this->deriveFeedingStatusFromLogs($slotLogs, $at, $variance, $preAnchorSameDay),
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
     * @param Collection<int, FeedingLog> $logs             Logs assigned to this slot.
     * @param Carbon                      $at               Scheduled time.
     * @param CarbonInterval              $variance         Window half-width for overdue threshold.
     * @param boolean                     $preAnchorSameDay Whether this slot precedes the anchor on the same calendar day.
     *
     * @return string
     */
    private function deriveFeedingStatusFromLogs(Collection $logs, Carbon $at, CarbonInterval $variance, bool $preAnchorSameDay = false): string
    {
        if ($logs->isNotEmpty()) {
            $hasFed = $logs->contains(fn (FeedingLog $log): bool => ! $log->was_skipped && (float) $log->amount !== 0.0);

            return $hasFed ? 'fed' : 'skipped';
        }

        if ($preAnchorSameDay) {
            return 'untracked';
        }

        return now()->gt($at->copy()->add($variance)) ? 'overdue' : 'upcoming';
    }

    /**
     * Filters times to those at-or-after a threshold datetime, so a supplement
     * assignment is never judged against times that closed before it existed.
     *
     * @param array<int, string> $times Scheduled HH:MM strings.
     * @param Carbon|null        $after Threshold datetime; times before it are excluded.
     *
     * @return array<int, string>
     */
    private function eligibleTimes(array $times, ?Carbon $after): array
    {
        if ($after === null) {
            return $times;
        }

        return array_values(array_filter(
            $times,
            fn (string $time): bool => Carbon::parse('today ' . $time)->gte($after),
        ));
    }

    /**
     * Builds scheduled and as-needed supplement entries with aggregate counts.
     *
     * @param Dog            $dog      Dog with dogSupplements.supplement loaded.
     * @param CarbonInterval $variance Window half-width.
     *
     * @return array<string, mixed>
     */
    private function buildSupplementData(Dog $dog, CarbonInterval $variance): array
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

            /** @var array<int, string> $times */
            $times = $assignment->times ?? [];

            if (count($times) === 0) {
                $asNeededEntries[] = $this->buildAsNeededEntry($assignment, $assignmentLogs);
                continue;
            }

            /** @var Carbon|null $assignmentCreatedAt */
            $assignmentCreatedAt = $assignment->created_at;
            $eligibleTimes       = $this->eligibleTimes($times, $assignmentCreatedAt);

            $totalExpected += count($eligibleTimes);

            [$timeSchedule] = $this->matchToWindows($eligibleTimes, $assignmentLogs, 'given_at', $variance);

            foreach ($timeSchedule as $entry) {
                /** @var SupplementLog|null $log */
                $log    = $entry['log'];
                $at     = $entry['at'];
                $status = $this->deriveSupplementStatus($log, $at, $variance);

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
