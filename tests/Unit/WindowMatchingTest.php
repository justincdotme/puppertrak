<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\SupplementLog;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Collection;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\Utils\TodayServiceTestable;

class WindowMatchingTest extends TestCase
{
    /**
     * @return array<string, array<string, mixed>>
     */
    public static function windowCases(): array
    {
        return [
            'log inside window matches' => [
                'times'             => ['07:00'],
                'logData'           => [['given_at' => '2026-09-07 07:40:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 1,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [0 => 0],
            ],
            'log outside window becomes extra' => [
                'times'             => ['07:00'],
                'logData'           => [['given_at' => '2026-09-07 12:00:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 0,
                'expectedExtras'    => 1,
                'matchedLogIndexes' => [0 => null],
            ],
            'nearest unsatisfied time wins' => [
                'times'             => ['07:00', '10:00'],
                'logData'           => [['given_at' => '2026-09-07 08:30:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 1,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [0 => 0, 1 => null],
            ],
            'non-tie nearest-first satisfies closer window' => [
                'times'             => ['07:00', '10:00'],
                'logData'           => [['given_at' => '2026-09-07 08:45:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 1,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [0 => null, 1 => 0],
            ],
            'tie goes to earlier time' => [
                'times'             => ['08:00', '10:00'],
                'logData'           => [['given_at' => '2026-09-07 09:00:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 1,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [0 => 0, 1 => null],
            ],
            'overlapping windows never double-satisfy' => [
                'times'   => ['08:00', '10:00'],
                'logData' => [
                    ['given_at' => '2026-09-07 09:00:00'],
                    ['given_at' => '2026-09-07 09:30:00'],
                ],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 2,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [0 => 0, 1 => 1],
            ],
            'empty times with logs produces all extras' => [
                'times'             => [],
                'logData'           => [['given_at' => '2026-09-07 08:00:00']],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 0,
                'expectedExtras'    => 1,
                'matchedLogIndexes' => [],
            ],
            'empty times and empty logs' => [
                'times'             => [],
                'logData'           => [],
                'varianceMinutes'   => 120,
                'expectedMatched'   => 0,
                'expectedExtras'    => 0,
                'matchedLogIndexes' => [],
            ],
        ];
    }

    /**
     * Supplements still use the greedy nearest-first window matching.
     *
     * @param array<int, string>                  $times             Scheduled HH:MM strings.
     * @param array<int, array{given_at: string}> $logData           Raw log timestamps.
     * @param integer                             $varianceMinutes   Window half-width in minutes.
     * @param integer                             $expectedMatched   Count of matched schedule entries.
     * @param integer                             $expectedExtras    Count of extra logs.
     * @param array<int, int|null>                $matchedLogIndexes Which log index matched each schedule slot (null = unmatched).
     *
     * @return void
     */
    #[DataProvider('windowCases')]
    public function test_window_matching(
        array $times,
        array $logData,
        int $varianceMinutes,
        int $expectedMatched,
        int $expectedExtras,
        array $matchedLogIndexes,
    ): void {
        Carbon::setTestNow(Carbon::parse('2026-09-07 12:00:00'));

        /** @var Collection<int, SupplementLog> $logs */
        $logs = new Collection(array_map(function (array $row): SupplementLog {
            $log = new SupplementLog;
            $log->forceFill(['given_at' => $row['given_at']]);

            return $log;
        }, $logData));

        $service  = new TodayServiceTestable;
        $variance = CarbonInterval::minutes($varianceMinutes);

        [$schedule, $extras] = $service->exposeMatchToWindows($times, $logs, 'given_at', $variance);

        $matched = collect($schedule)->filter(fn (array $entry): bool => $entry['log'] !== null)->count();
        $this->assertSame($expectedMatched, $matched, 'matched count');
        $this->assertCount($expectedExtras, $extras, 'extras count');

        foreach ($matchedLogIndexes as $slotIndex => $logIndex) {
            if ($logIndex === null) {
                $this->assertNull($schedule[$slotIndex]['log'], "slot {$slotIndex} should be unmatched");
            } else {
                $this->assertSame(
                    $logs[$logIndex],
                    $schedule[$slotIndex]['log'],
                    "slot {$slotIndex} should match log {$logIndex}",
                );
            }
        }
    }
}
