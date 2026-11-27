<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SupplementTodayTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{times: list<string>, createdAt: string, logs: list<array{at: string, skipped: bool}>, now: string, schedule: list<array{time: string|null, status: string, log: int|null}>, expected: int, handled: int, overdue: int}>
     */
    public static function leftoverDoseCases(): array
    {
        return [
            'late dose claims its overdue slot' => [
                'times'     => ['07:00'],
                'createdAt' => '2026-11-19 00:00',
                'logs'      => [['at' => '2026-11-20 10:00', 'skipped' => false]],
                'now'       => '2026-11-20 10:30',
                'schedule'  => [['time' => '07:00', 'status' => 'fed', 'log' => 0]],
                'expected'  => 1,
                'handled'   => 1,
                'overdue'   => 0,
            ],
            'dose after creation claims an untracked slot' => [
                'times'     => ['06:00'],
                'createdAt' => '2026-11-20 11:04',
                'logs'      => [['at' => '2026-11-20 14:53', 'skipped' => false]],
                'now'       => '2026-11-20 15:00',
                'schedule'  => [['time' => '06:00', 'status' => 'fed', 'log' => 0]],
                'expected'  => 1,
                'handled'   => 1,
                'overdue'   => 0,
            ],
            'early dose claims the next open slot' => [
                'times'     => ['18:00'],
                'createdAt' => '2026-11-19 00:00',
                'logs'      => [['at' => '2026-11-20 09:00', 'skipped' => true]],
                'now'       => '2026-11-20 10:00',
                'schedule'  => [['time' => '18:00', 'status' => 'skipped', 'log' => 0]],
                'expected'  => 1,
                'handled'   => 1,
                'overdue'   => 0,
            ],
            'leftover dose takes the latest open slot before it' => [
                'times'     => ['07:00', '12:00', '18:00'],
                'createdAt' => '2026-11-19 00:00',
                'logs'      => [
                    ['at' => '2026-11-20 07:05', 'skipped' => false],
                    ['at' => '2026-11-20 15:00', 'skipped' => false],
                ],
                'now'      => '2026-11-20 15:30',
                'schedule' => [
                    ['time' => '07:00', 'status' => 'fed', 'log' => 0],
                    ['time' => '12:00', 'status' => 'fed', 'log' => 1],
                    ['time' => '18:00', 'status' => 'upcoming', 'log' => null],
                ],
                'expected' => 3,
                'handled'  => 2,
                'overdue'  => 0,
            ],
            'more doses than slots lists the rest as extras' => [
                'times'     => ['07:00'],
                'createdAt' => '2026-11-19 00:00',
                'logs'      => [
                    ['at' => '2026-11-20 07:10', 'skipped' => false],
                    ['at' => '2026-11-20 12:00', 'skipped' => false],
                    ['at' => '2026-11-20 13:00', 'skipped' => true],
                ],
                'now'      => '2026-11-20 14:00',
                'schedule' => [
                    ['time' => '07:00', 'status' => 'fed', 'log' => 0],
                    ['time' => null, 'status' => 'fed', 'log' => 1],
                    ['time' => null, 'status' => 'skipped', 'log' => 2],
                ],
                'expected' => 1,
                'handled'  => 1,
                'overdue'  => 0,
            ],
        ];
    }

    /**
     * @return void
     */
    public function test_supplement_log_inside_window_marks_fed_and_increments_handled(): void
    {
        Carbon::setTestNow(Carbon::parse('today 10:00'));
        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        SupplementLog::factory()->for($dog)->create([
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => 1,
            'given_at'          => Carbon::parse('today 07:15'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.supplements.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.supplements.handled', 1)
            ->assertJsonPath('data.0.alerts.supplements_overdue', false);
    }

    /**
     * @return void
     */
    public function test_skipped_supplement_log_derives_skipped_with_no_warning(): void
    {
        Carbon::setTestNow(Carbon::parse('today 10:00'));
        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        SupplementLog::factory()->for($dog)->create([
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => 0,
            'was_skipped'       => true,
            'skip_reason'       => 'refused',
            'given_at'          => Carbon::parse('today 07:10'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.supplements.schedule.0.status', 'skipped')
            ->assertJsonPath('data.0.alerts.supplements_overdue', false);
    }

    /**
     * Every dose given today must appear on today's view, even when it falls
     * outside every slot's reminder window.
     *
     * @param list<string>                                                  $times     Scheduled HH:MM strings.
     * @param string                                                        $createdAt When the assignment was created.
     * @param list<array{at: string, skipped: bool}>                        $logs      Doses to record.
     * @param string                                                        $now       Clock time for the today request.
     * @param list<array{time: string|null, status: string, log: int|null}> $schedule  Expected entries; log indexes into $logs.
     * @param integer                                                       $expected  Expected doses count.
     * @param integer                                                       $handled   Handled doses count.
     * @param integer                                                       $overdue   Overdue doses count.
     *
     * @return void
     */
    #[DataProvider('leftoverDoseCases')]
    public function test_dose_outside_every_window_claims_an_open_slot(
        array $times,
        string $createdAt,
        array $logs,
        string $now,
        array $schedule,
        int $expected,
        int $handled,
        int $overdue,
    ): void {
        Carbon::setTestNow(Carbon::parse('2026-11-19 00:00'));
        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'frequency'     => 'interval',
            'interval_days' => 2,
            'start_date'    => '2026-11-20',
            'times'         => $times,
            'created_at'    => Carbon::parse($createdAt),
        ]);

        $logIds = [];

        foreach ($logs as $log) {
            $logIds[] = SupplementLog::factory()->for($dog)->create([
                'dog_supplement_id' => $assignment->id,
                'amount_given'      => $log['skipped'] ? 0 : 1,
                'was_skipped'       => $log['skipped'],
                'given_at'          => Carbon::parse($log['at']),
            ])->id;
        }

        Carbon::setTestNow(Carbon::parse($now));
        $response = $this->getJson("/api/dogs/{$dog->slug}/today")->assertOk();

        $actual = array_map(fn (array $entry): array => [
            'time'   => $entry['time'],
            'status' => $entry['status'],
            'log_id' => $entry['log_id'],
        ], $response->json('data.supplements.schedule'));

        $this->assertSame(array_map(fn (array $entry): array => [
            'time'   => $entry['time'],
            'status' => $entry['status'],
            'log_id' => $entry['log'] === null ? null : $logIds[$entry['log']],
        ], $schedule), $actual);

        $response->assertJsonPath('data.supplements.expected', $expected)
            ->assertJsonPath('data.supplements.handled', $handled)
            ->assertJsonPath('data.supplements.overdue', $overdue)
            ->assertJsonPath('data.alerts.supplements_overdue', $overdue > 0);
    }

    /**
     * Slots that closed before a mid-day assignment existed stay visible but
     * untracked, so the new assignment shows up without being flagged overdue.
     *
     * @return void
     */
    public function test_windows_before_assignment_creation_are_listed_as_untracked(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00', '18:00'],
            'created_at' => Carbon::parse('today 15:00'),
        ]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.supplements.expected', 1)
            ->assertJsonCount(2, 'data.0.supplements.schedule')
            ->assertJsonPath('data.0.supplements.schedule.0.time', '07:00')
            ->assertJsonPath('data.0.supplements.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.supplements.schedule.1.time', '18:00')
            ->assertJsonPath('data.0.supplements.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.supplements.overdue', 1)
            ->assertJsonPath('data.0.alerts.supplements_overdue', true);
    }

    /**
     * A slot that closed before the assignment existed must not claim a dose
     * that belongs to the next eligible slot.
     *
     * @return void
     */
    public function test_dose_matches_eligible_slot_not_earlier_ineligible_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 08:00'));
        $dog        = Dog::factory()->create(['feed_times' => null, 'created_at' => now()->subDay()]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00', '10:30'],
            'created_at' => now(),
        ]);
        SupplementLog::factory()->for($dog)->create([
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => 1,
            'given_at'          => Carbon::parse('2026-11-20 08:40'),
        ]);

        Carbon::setTestNow(Carbon::parse('2026-11-20 11:00'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.supplements.schedule.0.time', '07:00')
            ->assertJsonPath('data.0.supplements.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.supplements.schedule.0.log_id', null)
            ->assertJsonPath('data.0.supplements.schedule.1.time', '10:30')
            ->assertJsonPath('data.0.supplements.schedule.1.status', 'fed')
            ->assertJsonPath('data.0.supplements.expected', 1)
            ->assertJsonPath('data.0.supplements.handled', 1)
            ->assertJsonPath('data.0.alerts.supplements_overdue', false);
    }
}
