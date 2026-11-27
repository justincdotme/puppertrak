<?php

declare(strict_types=1);

use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * @return void
     */
    public function up(): void
    {
        Schema::table('feeding_logs', function (Blueprint $table) {
            $table->string('feed_time')->nullable()->after('fed_at');
        });

        $this->backfill();
    }

    /**
     * @return void
     */
    public function down(): void
    {
        Schema::table('feeding_logs', function (Blueprint $table) {
            $table->dropColumn('feed_time');
        });
    }

    /**
     * Replays the greedy nearest-first window matching per dog per calendar
     * day so existing history stays visually consistent.
     *
     * @return void
     */
    private function backfill(): void
    {
        $variance = CarbonInterval::minutes((int) config('puppertrak.reminder_variance_minutes'));

        $dogs = DB::table('dogs')->select(['id', 'feed_times'])->get();

        foreach ($dogs as $dog) {
            /** @var array<int, string> $feedTimes */
            $feedTimes = json_decode($dog->feed_times ?? '[]', true) ?: [];

            if (count($feedTimes) === 0) {
                continue;
            }

            $logs = DB::table('feeding_logs')
                ->where('dog_id', $dog->id)
                ->orderBy('fed_at')
                ->get(['id', 'fed_at']);

            $grouped = $logs->groupBy(
                fn (object $row): string => Carbon::parse($row->fed_at)->toDateString(),
            );

            foreach ($grouped as $date => $dayLogs) {
                $this->matchDay($feedTimes, $dayLogs, (string) $date, $variance);
            }
        }
    }

    /**
     * Greedy nearest-first match for one calendar day, mirroring
     * TodayService::matchToWindows semantics: ties go to the earlier time.
     *
     * @param array<int, string>        $feedTimes Scheduled HH:MM strings.
     * @param Collection<int, stdClass> $dayLogs   Logs for one day, ordered by fed_at.
     * @param string                    $date      Calendar date (Y-m-d).
     * @param CarbonInterval            $variance  Window half-width.
     *
     * @return void
     */
    private function matchDay(array $feedTimes, Collection $dayLogs, string $date, CarbonInterval $variance): void
    {
        $schedule = collect($feedTimes)->sort()->values()->map(fn (string $time): array => [
            'at'      => Carbon::parse($date . ' ' . $time),
            'claimed' => false,
        ])->all();

        foreach ($dayLogs as $row) {
            $timestamp = Carbon::parse($row->fed_at);

            $bestKey      = null;
            $bestDistance = PHP_INT_MAX;
            $bestSlotTime = PHP_INT_MAX;

            foreach ($schedule as $key => $entry) {
                if ($entry['claimed']) {
                    continue;
                }

                $windowStart = $entry['at']->copy()->sub($variance);
                $windowEnd   = $entry['at']->copy()->add($variance);

                if (! $timestamp->between($windowStart, $windowEnd)) {
                    continue;
                }

                $distance = abs($timestamp->diffInSeconds($entry['at']));
                $slotTime = $entry['at']->getTimestamp();

                if ($distance < $bestDistance || ($distance === $bestDistance && $slotTime < $bestSlotTime)) {
                    $bestKey      = $key;
                    $bestDistance = $distance;
                    $bestSlotTime = $slotTime;
                }
            }

            if ($bestKey !== null) {
                $schedule[$bestKey]['claimed'] = true;

                DB::table('feeding_logs')
                    ->where('id', $row->id)
                    ->update(['feed_time' => Carbon::parse($schedule[$bestKey]['at'])->format('H:i')]);
            }
        }
    }
};
