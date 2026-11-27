<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SupplementScheduleTest extends TestCase
{
    use RefreshDatabase;

    private const STORED_STATES = [
        'interval' => [
            'frequency'     => 'interval',
            'interval_days' => 3,
            'start_date'    => '2026-11-20',
            'times'         => ['08:00'],
        ],
        'daily' => [
            'frequency'     => 'daily',
            'interval_days' => null,
            'start_date'    => null,
            'times'         => ['08:00'],
        ],
    ];

    /**
     * @return array<string, array{payload: array<string, mixed>, errorField: string}>
     */
    public static function validationRejectionCases(): array
    {
        return [
            'times with as_needed' => [
                'payload' => [
                    'frequency' => 'as_needed',
                    'times'     => ['07:00'],
                ],
                'errorField' => 'times',
            ],
            'interval without interval_days' => [
                'payload' => [
                    'frequency'  => 'interval',
                    'start_date' => '2026-11-20',
                ],
                'errorField' => 'interval_days',
            ],
            'interval without start_date' => [
                'payload' => [
                    'frequency'     => 'interval',
                    'interval_days' => 3,
                ],
                'errorField' => 'start_date',
            ],
            'interval_days below 2' => [
                'payload' => [
                    'frequency'     => 'interval',
                    'interval_days' => 1,
                    'start_date'    => '2026-11-20',
                ],
                'errorField' => 'interval_days',
            ],
            'interval_days above 365' => [
                'payload' => [
                    'frequency'     => 'interval',
                    'interval_days' => 366,
                    'start_date'    => '2026-11-20',
                ],
                'errorField' => 'interval_days',
            ],
            'interval_days with daily' => [
                'payload' => [
                    'frequency'     => 'daily',
                    'interval_days' => 3,
                ],
                'errorField' => 'interval_days',
            ],
            'start_date with daily' => [
                'payload' => [
                    'frequency'  => 'daily',
                    'start_date' => '2026-11-20',
                ],
                'errorField' => 'start_date',
            ],
            'invalid frequency value' => [
                'payload' => [
                    'frequency' => 'weekly',
                ],
                'errorField' => 'frequency',
            ],
        ];
    }

    /**
     * @return array<string, array{0: string, 1: string, 2: int|null, 3: string|null, 4: list<string>|null, 5: string|null, 6: string|null, 7: string}>
     */
    public static function scheduleDueCases(): array
    {
        return [
            'interval due on start date'            => ['2026-11-20 12:00', 'interval', 3, '2026-11-20', null, null, 'due', 'schedule'],
            'interval due on day N'                 => ['2026-11-23 12:00', 'interval', 3, '2026-11-20', null, null, 'due', 'schedule'],
            'interval not due on day N-1'           => ['2026-11-22 12:00', 'interval', 3, '2026-11-20', null, null, 'not_due', 'schedule'],
            'interval not due before start date'    => ['2026-11-19 12:00', 'interval', 3, '2026-11-20', null, null, 'not_due', 'schedule'],
            'daily without time due all day'        => ['2026-11-20 06:00', 'daily', null, null, null, null, 'due', 'schedule'],
            'daily without time logged clears due'  => ['2026-11-20 14:00', 'daily', null, null, null, '2026-11-20 10:00', 'fed', 'schedule'],
            'daily without time never overdue'      => ['2026-11-20 23:59', 'daily', null, null, null, null, 'due', 'schedule'],
            'daily with time overdue as before'     => ['2026-11-20 14:00', 'daily', null, null, ['07:00'], null, 'overdue', 'schedule'],
            'interval with time overdue on due day' => ['2026-11-20 14:00', 'interval', 3, '2026-11-20', ['07:00'], null, 'overdue', 'schedule'],
            'interval with time not due on off day' => ['2026-11-21 14:00', 'interval', 3, '2026-11-20', ['07:00'], null, 'not_due', 'schedule'],
            'as needed unchanged'                   => ['2026-11-20 14:00', 'as_needed', null, null, null, null, null, 'as_needed'],
            'interval without time logged clears'   => ['2026-11-20 14:00', 'interval', 3, '2026-11-20', null, '2026-11-20 10:00', 'fed', 'schedule'],
        ];
    }

    /**
     * @return array<string, array{amount: int, skipped: bool, status: string}>
     */
    public static function offDayDoseCases(): array
    {
        return [
            'given dose'   => ['amount' => 1, 'skipped' => false, 'status' => 'fed'],
            'skipped dose' => ['amount' => 0, 'skipped' => true, 'status' => 'skipped'],
        ];
    }

    /**
     * @return array<string, array{stored: string, payload: array<string, mixed>, errorFields: list<string>}>
     */
    public static function updateRejectionCases(): array
    {
        return [
            'interval_days on a daily row' => [
                'stored'      => 'daily',
                'payload'     => ['interval_days' => 3],
                'errorFields' => ['interval_days'],
            ],
            'start_date on a daily row' => [
                'stored'      => 'daily',
                'payload'     => ['start_date' => '2026-11-20'],
                'errorFields' => ['start_date'],
            ],
            'switch to interval without interval fields' => [
                'stored'      => 'daily',
                'payload'     => ['frequency' => 'interval'],
                'errorFields' => ['interval_days', 'start_date'],
            ],
            'null interval_days on an interval row' => [
                'stored'      => 'interval',
                'payload'     => ['interval_days' => null],
                'errorFields' => ['interval_days'],
            ],
            'interval_days above 365' => [
                'stored'      => 'interval',
                'payload'     => ['interval_days' => 366],
                'errorFields' => ['interval_days'],
            ],
        ];
    }

    /**
     * @return array<string, array{stored: string, payload: array<string, mixed>, expected: array<string, mixed>}>
     */
    public static function updateAcceptanceCases(): array
    {
        return [
            'partial interval_days on an interval row' => [
                'stored'   => 'interval',
                'payload'  => ['interval_days' => 5],
                'expected' => ['frequency' => 'interval', 'interval_days' => 5, 'start_date' => '2026-11-20'],
            ],
            'partial start_date on an interval row' => [
                'stored'   => 'interval',
                'payload'  => ['start_date' => '2026-11-25'],
                'expected' => ['frequency' => 'interval', 'interval_days' => 3, 'start_date' => '2026-11-25'],
            ],
            'switch to interval with interval fields' => [
                'stored'   => 'daily',
                'payload'  => ['frequency' => 'interval', 'interval_days' => 365, 'start_date' => '2026-11-20'],
                'expected' => ['frequency' => 'interval', 'interval_days' => 365, 'start_date' => '2026-11-20'],
            ],
            'daily with null interval fields' => [
                'stored'   => 'daily',
                'payload'  => ['frequency' => 'daily', 'interval_days' => null, 'start_date' => null, 'times' => ['09:00']],
                'expected' => ['frequency' => 'daily', 'interval_days' => null, 'start_date' => null, 'times' => ['09:00']],
            ],
            'switch to daily clears interval fields' => [
                'stored'   => 'interval',
                'payload'  => ['frequency' => 'daily'],
                'expected' => ['frequency' => 'daily', 'interval_days' => null, 'start_date' => null, 'times' => ['08:00']],
            ],
            'switch to as needed clears the schedule' => [
                'stored'   => 'interval',
                'payload'  => ['frequency' => 'as_needed'],
                'expected' => ['frequency' => 'as_needed', 'interval_days' => null, 'start_date' => null, 'times' => null],
            ],
        ];
    }

    /**
     * @return void
     */
    public function test_backfill_marks_only_rows_with_times_as_daily(): void
    {
        $dog     = Dog::factory()->create(['feed_times' => null]);
        $timed   = DogSupplement::factory()->for($dog)->create(['times' => ['07:00'], 'frequency' => 'as_needed']);
        $empty   = DogSupplement::factory()->for($dog)->create(['times' => [], 'frequency' => 'as_needed']);
        $untimed = DogSupplement::factory()->for($dog)->create(['times' => null, 'frequency' => 'as_needed']);

        $migration = require database_path('migrations/2026_11_25_000002_add_schedule_columns_to_dog_supplements_table.php');
        $migration->down();
        $migration->up();

        $this->assertSame('daily', $timed->fresh()?->frequency);
        $this->assertSame('as_needed', $empty->fresh()?->frequency);
        $this->assertSame('as_needed', $untimed->fresh()?->frequency);
    }

    /**
     * @param array<string, mixed> $payload    Fields to submit.
     * @param string               $errorField Expected validation error key.
     *
     * @return void
     */
    #[DataProvider('validationRejectionCases')]
    public function test_store_rejects_invalid_schedule_combinations(array $payload, string $errorField): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", array_merge([
            'supplement_id' => $supplement->id,
            'dose'          => 1,
        ], $payload));

        $response->assertUnprocessable()
            ->assertJsonValidationErrors($errorField);
    }

    /**
     * Verify interval schedule with all required fields is accepted.
     *
     * @return void
     */
    public function test_store_accepts_valid_interval_schedule(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
            'frequency'     => 'interval',
            'interval_days' => 3,
            'start_date'    => '2026-11-20',
            'times'         => ['08:00'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.frequency', 'interval')
            ->assertJsonPath('data.interval_days', 3)
            ->assertJsonPath('data.start_date', '2026-11-20');
    }

    /**
     * Verify frequency is inferred as daily when times provided, as_needed otherwise.
     *
     * @return void
     */
    public function test_store_without_frequency_infers_from_times(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $withTimes = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
            'times'         => ['07:00'],
        ]);

        $withTimes->assertCreated()
            ->assertJsonPath('data.frequency', 'daily');

        $withoutTimes = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
        ]);

        $withoutTimes->assertCreated()
            ->assertJsonPath('data.frequency', 'as_needed');
    }

    /**
     * Verify resource includes interval schedule fields.
     *
     * @return void
     */
    public function test_resource_exposes_schedule_fields(): void
    {
        $dog = Dog::factory()->create();
        DogSupplement::factory()->for($dog)->create([
            'frequency'     => 'interval',
            'interval_days' => 3,
            'start_date'    => '2026-11-20',
            'times'         => ['08:00'],
        ]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/supplements");

        $response->assertOk();

        $item = $response->json('data.0');
        $this->assertSame('interval', $item['frequency']);
        $this->assertSame(3, $item['interval_days']);
        $this->assertSame('2026-11-20', $item['start_date']);
    }

    /**
     * @param string            $now          Frozen clock time.
     * @param string            $frequency    Frequency value.
     * @param integer|null      $intervalDays Interval days if applicable.
     * @param string|null       $startDate    Start date if applicable.
     * @param list<string>|null $times        Specific times if applicable.
     * @param string|null       $logAt        Log timestamp if a log should exist.
     * @param string|null       $expectStatus Expected status value.
     * @param string            $expectIn     Which section: 'schedule' or 'as_needed'.
     *
     * @return void
     */
    #[DataProvider('scheduleDueCases')]
    public function test_today_schedule_logic(
        string $now,
        string $frequency,
        ?int $intervalDays,
        ?string $startDate,
        ?array $times,
        ?string $logAt,
        ?string $expectStatus,
        string $expectIn,
    ): void {
        Carbon::setTestNow(Carbon::parse($now));

        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'frequency'     => $frequency,
            'interval_days' => $intervalDays,
            'start_date'    => $startDate,
            'times'         => $times,
            'created_at'    => Carbon::parse($startDate ?? '2026-11-01')->subDay(),
        ]);

        if ($logAt !== null) {
            SupplementLog::factory()->for($dog)->create([
                'dog_supplement_id' => $assignment->id,
                'amount_given'      => 1,
                'given_at'          => Carbon::parse($logAt),
            ]);
        }

        $response = $this->getJson('/api/dashboard/today');
        $response->assertOk();

        if ($expectIn === 'as_needed') {
            $response->assertJsonCount(1, 'data.0.supplements.as_needed');
            $response->assertJsonCount(0, 'data.0.supplements.schedule');

            return;
        }

        if ($expectStatus === 'not_due') {
            $response->assertJsonCount(0, 'data.0.supplements.schedule');
            $response->assertJsonCount(0, 'data.0.supplements.as_needed');

            return;
        }

        $response->assertJsonPath('data.0.supplements.schedule.0.status', $expectStatus);
    }

    /**
     * Verify daily schedules without specific times never show overdue alerts.
     *
     * @return void
     */
    public function test_daily_without_time_never_triggers_overdue_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 23:59'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        DogSupplement::factory()->for($dog)->create([
            'frequency'  => 'daily',
            'times'      => null,
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.supplements_overdue', false);
    }

    /**
     * Verify interval schedules without specific times never show overdue alerts.
     *
     * @return void
     */
    public function test_interval_without_time_never_triggers_overdue_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 23:59'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        DogSupplement::factory()->for($dog)->create([
            'frequency'     => 'interval',
            'interval_days' => 3,
            'start_date'    => '2026-11-20',
            'times'         => null,
            'created_at'    => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.supplements_overdue', false);
    }

    /**
     * Verify hidden dogs do not appear in today endpoint even with active schedules.
     *
     * @return void
     */
    public function test_hidden_dog_excluded_from_dashboard_with_schedules(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 12:00'));
        Dog::factory()->create([
            'feed_times' => null,
            'hidden_at'  => now()->subHour(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /**
     * A dose logged on an off day stays visible without counting toward the
     * day's expected or handled totals.
     *
     * @param integer $amount  Amount given.
     * @param boolean $skipped Whether the log is a skip.
     * @param string  $status  Expected entry status.
     *
     * @return void
     */
    #[DataProvider('offDayDoseCases')]
    public function test_interval_dose_logged_on_off_day_is_listed_untimed(int $amount, bool $skipped, string $status): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-21 14:00'));
        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'frequency'     => 'interval',
            'interval_days' => 3,
            'start_date'    => '2026-11-20',
            'times'         => ['07:00'],
            'created_at'    => '2026-11-19 00:00',
        ]);
        SupplementLog::factory()->for($dog)->create([
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => $amount,
            'was_skipped'       => $skipped,
            'skip_reason'       => $skipped ? 'refused' : null,
            'given_at'          => Carbon::parse('2026-11-21 10:00'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(1, 'data.0.supplements.schedule')
            ->assertJsonPath('data.0.supplements.schedule.0.time', null)
            ->assertJsonPath('data.0.supplements.schedule.0.status', $status)
            ->assertJsonPath('data.0.supplements.expected', 0)
            ->assertJsonPath('data.0.supplements.handled', 0);
    }

    /**
     * @param string               $stored      Key into STORED_STATES.
     * @param array<string, mixed> $payload     Fields to submit.
     * @param list<string>         $errorFields Expected validation error keys.
     *
     * @return void
     */
    #[DataProvider('updateRejectionCases')]
    public function test_update_rejects_invalid_schedule_changes(string $stored, array $payload, array $errorFields): void
    {
        $assignment = DogSupplement::factory()->create(self::STORED_STATES[$stored]);

        $this->putJson("/api/dog-supplements/{$assignment->id}", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($errorFields);
    }

    /**
     * @param string               $stored   Key into STORED_STATES.
     * @param array<string, mixed> $payload  Fields to submit.
     * @param array<string, mixed> $expected Expected resource fields after the update.
     *
     * @return void
     */
    #[DataProvider('updateAcceptanceCases')]
    public function test_update_applies_schedule_changes(string $stored, array $payload, array $expected): void
    {
        $assignment = DogSupplement::factory()->create(self::STORED_STATES[$stored]);

        $response = $this->putJson("/api/dog-supplements/{$assignment->id}", $payload)->assertOk();

        foreach ($expected as $field => $value) {
            $response->assertJsonPath("data.{$field}", $value);
        }
    }
}
