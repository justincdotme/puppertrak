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

        /** @var Carbon|null $dogCreatedAt */
        $dogCreatedAt = $dog->created_at;

        $eligibleFeedTimes = $this->eligibleTimes($feedTimes, $dogCreatedAt, 'today');

        $todayStart     = now()->startOfDay();
        $yesterdayStart = now()->subDay()->startOfDay();

        $allFeedingLogs = $dog->feedingLogs()
            ->with('food')
            ->whereBetween('fed_at', [$yesterdayStart, now()->endOfDay()])
            ->orderBy('fed_at')
            ->get();

        /** @var Collection<int, FeedingLog> $todayFeedingLogs */
        $todayFeedingLogs = $allFeedingLogs->filter(function (FeedingLog $log) use ($todayStart): bool {
            /** @var Carbon $fedAt */
            $fedAt = $log->fed_at;

            return $fedAt->gte($todayStart);
        })->values();

        /** @var Collection<int, FeedingLog> $yesterdayFeedingLogs */
        $yesterdayFeedingLogs = $allFeedingLogs->filter(function (FeedingLog $log) use ($todayStart): bool {
            /** @var Carbon $fedAt */
            $fedAt = $log->fed_at;

            return $fedAt->lt($todayStart);
        })->values();

        [$feedSchedule, $feedExtras] = $this->matchToWindows(
            $eligibleFeedTimes,
            $todayFeedingLogs,
            'fed_at',
            $variance,
        );

        $feedScheduleEntries = $this->buildFeedingScheduleEntries($feedSchedule, $variance);
        $feedExtraEntries    = $this->buildFeedingExtras($feedExtras);
        $feedingOverdueCount = collect($feedScheduleEntries)->where('status', 'overdue')->count();

        $feedingsOverdueAlert = $this->hasFeedingMissStreak(
            $feedTimes,
            $dogCreatedAt,
            $feedSchedule,
            $yesterdayFeedingLogs,
            $variance,
        );

        $supplementResult = $this->buildSupplementData($dog, $variance);

        $recentHours     = (int) config('puppertrak.health_note_recent_hours');
        $healthNoteCount = $dog->healthNotes()
            ->where('noted_at', '>=', now()->subHours($recentHours))
            ->count();

        /** @var Carbon|null $archivedAt */
        $archivedAt = $dog->archived_at;

        return [
            'dog' => [
                'id'          => $dog->id,
                'slug'        => $dog->slug,
                'name'        => $dog->name,
                'breed'       => $dog->breed,
                'weight'      => $dog->weight,
                'weight_unit' => $dog->weight_unit,
                'archived_at' => $archivedAt?->toIso8601String(),
            ],
            'feedings' => [
                'expected' => count($eligibleFeedTimes),
                'handled'  => collect($feedScheduleEntries)->whereIn('status', ['fed', 'skipped'])->count(),
                'fed'      => collect($feedScheduleEntries)->where('status', 'fed')->count(),
                'skipped'  => collect($feedScheduleEntries)->where('status', 'skipped')->count(),
                'overdue'  => $feedingOverdueCount,
                'schedule' => $feedScheduleEntries,
                'extras'   => $feedExtraEntries,
            ],
            'supplements' => $supplementResult,
            'alerts'      => [
                'feedings_overdue'    => $feedingsOverdueAlert,
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
     * @param Collection<int, TLog> $logs     Logs for the target day, ordered by timestamp.
     * @param string                $column   Timestamp attribute on the log model.
     * @param CarbonInterval        $variance Window half-width.
     * @param string                $day      Date prefix for Carbon::parse ('today', 'yesterday').
     *
     * @return array{0: array<int, array{at: Carbon, log: TLog|null}>, 1: list<TLog>}
     */
    protected function matchToWindows(array $times, Collection $logs, string $column, CarbonInterval $variance, string $day = 'today'): array
    {
        /** @var array<int, array{at: Carbon, log: Model|null}> $schedule */
        $schedule = collect($times)->sort()->values()->map(fn (string $time): array => [
            'at'  => Carbon::parse($day . ' ' . $time),
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
     * A scheduled time whose window predates the owning dog or assignment's
     * creation is not a window at all - dropped before matching so it never
     * appears in the schedule, counts, or streak checks.
     *
     * @param array<int, string> $times     Scheduled HH:MM strings.
     * @param Carbon|null        $createdAt Owning record's created_at.
     * @param string             $day       Date prefix for Carbon::parse ('today', 'yesterday').
     *
     * @return array<int, string>
     */
    private function eligibleTimes(array $times, ?Carbon $createdAt, string $day): array
    {
        if ($createdAt === null) {
            return $times;
        }

        return array_values(array_filter(
            $times,
            fn (string $time): bool => Carbon::parse($day . ' ' . $time)->gte($createdAt),
        ));
    }

    /**
     * @param array<int, array{at: Carbon, log: Model|null}> $schedule Raw schedule from matchToWindows.
     * @param CarbonInterval                                 $variance Window half-width.
     *
     * @return array<int, array<string, mixed>>
     */
    private function buildFeedingScheduleEntries(array $schedule, CarbonInterval $variance): array
    {
        $entries = [];

        foreach ($schedule as $entry) {
            /** @var FeedingLog|null $log */
            $log = $entry['log'];
            $at  = $entry['at'];

            $entries[] = [
                'time'        => $at->format('H:i'),
                'status'      => $this->deriveFeedingStatus($log, $at, $variance),
                'log_id'      => $log?->id,
                'logged_at'   => $this->formatTimestamp($log?->fed_at),
                'amount'      => $log?->amount,
                'unit'        => $log?->unit,
                'food_name'   => $log?->food?->name,
                'skip_reason' => $log?->skip_reason,
            ];
        }

        return $entries;
    }

    /**
     * @param list<Model> $extras Unmatched feeding logs.
     *
     * @return list<array<string, mixed>>
     */
    private function buildFeedingExtras(array $extras): array
    {
        $entries = [];

        foreach ($extras as $extraModel) {
            /** @var FeedingLog $log */
            $log       = $extraModel;
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
     * @param FeedingLog|null $log      Matched log or null.
     * @param Carbon          $at       Scheduled time.
     * @param CarbonInterval  $variance Window half-width.
     *
     * @return string
     */
    private function deriveFeedingStatus(?FeedingLog $log, Carbon $at, CarbonInterval $variance): string
    {
        if ($log !== null) {
            return ($log->was_skipped || (float) $log->amount === 0.0) ? 'skipped' : 'fed';
        }

        return now()->gt($at->copy()->add($variance)) ? 'overdue' : 'upcoming';
    }

    /**
     * True when the two most recently closed eligible feeding windows (across
     * yesterday and today) are both unsatisfied.
     *
     * @param array<int, string>                             $feedTimes     Scheduled HH:MM strings.
     * @param Carbon|null                                    $createdAt     Dog's created_at timestamp.
     * @param array<int, array{at: Carbon, log: Model|null}> $todaySchedule Today's matched windows from matchToWindows.
     * @param Collection<int, FeedingLog>                    $yesterdayLogs Yesterday's feeding logs.
     * @param CarbonInterval                                 $variance      Window half-width.
     *
     * @return boolean
     */
    private function hasFeedingMissStreak(
        array $feedTimes,
        ?Carbon $createdAt,
        array $todaySchedule,
        Collection $yesterdayLogs,
        CarbonInterval $variance,
    ): bool {
        if (count($feedTimes) === 0) {
            return false;
        }

        [$yesterdaySchedule] = $this->matchToWindows(
            $this->eligibleTimes($feedTimes, $createdAt, 'yesterday'),
            $yesterdayLogs,
            'fed_at',
            $variance,
            'yesterday',
        );

        $allWindows = array_merge($yesterdaySchedule, $todaySchedule);

        $closedEligible = collect($allWindows)
            ->filter(function (array $entry) use ($variance): bool {
                /** @var Carbon $at */
                $at = $entry['at'];

                return now()->gt($at->copy()->add($variance));
            })
            ->sortByDesc(function (array $entry): int {
                /** @var Carbon $at */
                $at = $entry['at'];

                return $at->getTimestamp();
            })
            ->values();

        if ($closedEligible->count() < 2) {
            return false;
        }

        return $closedEligible[0]['log'] === null && $closedEligible[1]['log'] === null;
    }

    /**
     * Builds schedule, as-needed, and counts for all supplement assignments.
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
            $eligibleTimes       = $this->eligibleTimes($times, $assignmentCreatedAt, 'today');

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
