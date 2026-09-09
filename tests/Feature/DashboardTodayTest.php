<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\FeedingLog;
use App\Models\HealthNote;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DashboardTodayTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{0: string, 1: string, 2: boolean}>
     */
    public static function graceWindowCases(): array
    {
        return [
            'before the scheduled time'    => ['today 06:00', 'upcoming', false],
            'inside the grace period'      => ['today 08:30', 'upcoming', false],
            'grace period exactly elapsed' => ['today 09:00', 'upcoming', false],
            'one minute past the grace'    => ['today 09:01', 'overdue', true],
            'hours past the grace'         => ['today 14:00', 'overdue', true],
        ];
    }

    /**
     * @return array<string, array{0: list<array<string, mixed>>, 1: string}>
     */
    public static function slotStatusCases(): array
    {
        return [
            'all skipped' => [
                [
                    ['amount' => 0, 'was_skipped' => true, 'skip_reason' => 'sick', 'fed_at' => 'today 07:10'],
                    ['amount' => 0, 'was_skipped' => true, 'skip_reason' => 'still sick', 'fed_at' => 'today 07:30'],
                ],
                'skipped',
            ],
            'mixed skipped and fed' => [
                [
                    ['amount' => 0, 'was_skipped' => true, 'skip_reason' => 'sick', 'fed_at' => 'today 07:10'],
                    ['amount' => 1, 'was_skipped' => false, 'skip_reason' => null, 'fed_at' => 'today 07:45'],
                ],
                'fed',
            ],
            'empty slot' => [
                [],
                'upcoming',
            ],
        ];
    }

    /**
     * @param string  $now            Test clock time.
     * @param string  $expectedStatus Status of the 07:00 window.
     * @param boolean $expectedAlert  Expected feeding_missed value.
     *
     * @return void
     */
    #[DataProvider('graceWindowCases')]
    public function test_missed_meal_alert_waits_for_the_grace_period(string $now, string $expectedStatus, bool $expectedAlert): void
    {
        Carbon::setTestNow(Carbon::parse($now));
        Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', $expectedStatus)
            ->assertJsonPath('data.0.feedings.schedule.0.logs', [])
            ->assertJsonPath('data.0.alerts.feeding_missed', $expectedAlert);
    }

    /**
     * @return void
     */
    public function test_two_missed_meals_still_report_a_single_boolean(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:01'));
        Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.alerts.feeding_missed', true);
    }

    /**
     * Skipping is a deliberate act, so it must never surface as a missed meal.
     *
     * @return void
     */
    public function test_skipped_meal_is_not_a_missed_meal(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'      => 0,
            'was_skipped' => true,
            'skip_reason' => "wouldn't eat",
            'fed_at'      => Carbon::parse('today 07:15'),
            'feed_time'   => '07:00',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'skipped')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_untracked_window_never_counts_as_missed(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:00'));
        Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow(Carbon::parse('today 23:59'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(2, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'untracked')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_dog_without_feed_times_is_never_missed(): void
    {
        Carbon::setTestNow(Carbon::parse('today 23:00'));
        Dog::factory()->create([
            'feed_times' => null,
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(0, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_log_with_feed_time_satisfies_the_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('today 10:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('today 07:40'),
            'feed_time' => '07:00',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feeding_missed', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonCount(1, 'data.0.feedings.schedule.0.logs');
    }

    /**
     * @return void
     */
    public function test_log_without_feed_time_is_an_extra(): void
    {
        Carbon::setTestNow(Carbon::parse('today 13:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 0.25,
            'fed_at'    => Carbon::parse('today 12:00'),
            'feed_time' => null,
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.0.logs', [])
            ->assertJsonPath('data.0.alerts.feeding_missed', true)
            ->assertJsonCount(1, 'data.0.feedings.extras');
    }

    /**
     * @return void
     */
    public function test_explicit_feed_time_assigns_to_correct_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('today 11:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '10:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('today 08:30'),
            'feed_time' => '07:00',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'upcoming');
    }

    /**
     * A log timestamped before midnight belongs to yesterday. It will not
     * appear in today's query.
     *
     * @return void
     */
    public function test_midnight_boundary_excludes_yesterdays_log(): void
    {
        Carbon::setTestNow(Carbon::parse('today 02:31'));
        $dog = Dog::factory()->create([
            'feed_times' => ['00:30'],
            'created_at' => now()->subDays(2),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('yesterday 23:30'),
            'feed_time' => '00:30',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.alerts.feeding_missed', true);
    }

    /**
     * @return void
     */
    public function test_supplement_times_get_their_own_overdue_flag(): void
    {
        Carbon::setTestNow(Carbon::parse('today 09:30'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.supplements_overdue', true)
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_as_needed_assignments_are_listed_but_never_overdue(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        DogSupplement::factory()->asNeeded()->for($dog)->create();

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.supplements_overdue', false)
            ->assertJsonCount(1, 'data.0.supplements.as_needed');
    }

    /**
     * @return void
     */
    public function test_archived_dogs_are_excluded_from_the_dashboard(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        Dog::factory()->archived()->create();

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /**
     * @return void
     */
    public function test_recent_health_note_badge_counts_last_24_hours(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create(['feed_times' => null]);
        HealthNote::factory()->for($dog)->create([
            'occurred_at' => now()->subHours(2),
        ]);
        HealthNote::factory()->for($dog)->create([
            'occurred_at' => now()->subHours(30),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.health_notes_last_24h', 1);
    }

    /**
     * @return void
     */
    public function test_active_dog_today_returns_single_object_envelope(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk()
            ->assertJsonPath('data.dog.slug', $dog->slug)
            ->assertJsonStructure([
                'data' => ['dog', 'feedings', 'supplements', 'alerts', 'health_notes_last_24h'],
            ]);

        $data = $response->json('data');
        $this->assertArrayHasKey('dog', $data, 'data is an object with a dog key, not an array of dogs');
    }

    /**
     * Both key sets are exhaustive, so an extra key is a value no consumer
     * reads and no code path keeps current.
     *
     * @return void
     */
    public function test_feedings_block_carries_only_schedule_and_extras(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk();

        $feedings = $response->json('data.feedings');
        $alerts   = $response->json('data.alerts');

        $this->assertIsArray($feedings);
        $this->assertIsArray($alerts);
        $this->assertEqualsCanonicalizing(['schedule', 'extras'], array_keys($feedings));
        $this->assertEqualsCanonicalizing(['feeding_missed', 'supplements_overdue'], array_keys($alerts));
    }

    /**
     * @return void
     */
    public function test_schedule_entry_shape_has_time_status_and_logs(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('today 07:30'),
            'feed_time' => '07:00',
        ]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk();

        $entry = $response->json('data.feedings.schedule.0');
        $this->assertEqualsCanonicalizing(['time', 'status', 'logs'], array_keys($entry));
        $this->assertCount(1, $entry['logs']);

        $logKeys = array_keys($entry['logs'][0]);
        $this->assertEqualsCanonicalizing(
            ['log_id', 'logged_at', 'amount', 'unit', 'food_name', 'skip_reason', 'was_skipped'],
            $logKeys,
        );
    }

    /**
     * @return void
     */
    public function test_archived_dog_still_resolves_on_per_dog_today(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->archived()->create(['feed_times' => null]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk()
            ->assertJsonPath('data.dog.slug', $dog->slug);
    }

    /**
     * @return void
     */
    public function test_pre_anchor_window_is_untracked_while_later_windows_still_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(2, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.feedings.schedule.0.time', '07:00')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.feedings.schedule.1.time', '18:00')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.alerts.feeding_missed', true);
    }

    /**
     * @return void
     */
    public function test_log_matching_untracked_window_flips_to_fed(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        $dog = Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('today 07:30'),
            'feed_time' => '07:00',
        ]);

        Carbon::setTestNow(Carbon::parse('today 17:00'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'upcoming')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_skip_matching_untracked_window_flips_to_skipped(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        $dog = Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);
        FeedingLog::factory()->for($dog)->create([
            'amount'      => 0,
            'was_skipped' => true,
            'skip_reason' => 'not hungry',
            'fed_at'      => Carbon::parse('today 07:15'),
            'feed_time'   => '07:00',
        ]);

        Carbon::setTestNow(Carbon::parse('today 17:00'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'skipped')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * Editing feed_times on an existing dog moves the anchor forward,
     * turning earlier today's windows into untracked.
     *
     * @return void
     */
    public function test_feed_times_edit_moves_anchor_and_earlier_windows_become_untracked(): void
    {
        $creationTime = Carbon::parse('today 08:00')->subDay();
        $editTime     = Carbon::parse('today 14:00');
        $testTime     = Carbon::parse('today 20:01');

        Carbon::setTestNow($creationTime);
        $dog = Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow($editTime);
        $dog->update(['feed_times' => ['07:00', '12:00', '18:00']]);

        Carbon::setTestNow($testTime);
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(3, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'untracked')
            ->assertJsonPath('data.0.feedings.schedule.2.status', 'overdue');
    }

    /**
     * The day after creation all windows are eligible because the anchor
     * falls on a different calendar day.
     *
     * @return void
     */
    public function test_next_day_after_creation_has_no_untracked_windows(): void
    {
        $creationTime = Carbon::parse('today 20:00')->subDay();
        $testTime     = Carbon::parse('today 20:01');

        Carbon::setTestNow($creationTime);
        Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow($testTime);
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.alerts.feeding_missed', true);
    }

    /**
     * @return void
     */
    public function test_today_payload_carries_the_dogs_feeding_instructions(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        Dog::factory()->create([
            'feed_times'           => null,
            'feeding_instructions' => 'Grind up the food, add water.',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.dog.feeding_instructions', 'Grind up the food, add water.');
    }

    /**
     * Reproduces the Odie scenario: feed times 05:30/10:00/17:00 and a log
     * at 08:15 explicitly assigned to the 05:30 slot. The 05:30 slot should
     * be fed, the 10:00 slot should be upcoming, and no missed-meal alert.
     *
     * @return void
     */
    public function test_explicit_feed_time_prevents_wrong_slot_assignment(): void
    {
        Carbon::setTestNow(Carbon::parse('today 09:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['05:30', '10:00', '17:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 0.5,
            'fed_at'    => Carbon::parse('today 08:15'),
            'feed_time' => '05:30',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.time', '05:30')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.schedule.1.time', '10:00')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'upcoming')
            ->assertJsonPath('data.0.feedings.schedule.2.time', '17:00')
            ->assertJsonPath('data.0.feedings.schedule.2.status', 'upcoming')
            ->assertJsonPath('data.0.alerts.feeding_missed', false);
    }

    /**
     * @param list<array<string, mixed>> $logStates Log attributes for the slot.
     * @param string                     $expected  Expected slot status.
     *
     * @return void
     */
    #[DataProvider('slotStatusCases')]
    public function test_slot_status_with_multiple_logs(array $logStates, string $expected): void
    {
        Carbon::setTestNow(Carbon::parse('today 08:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);

        foreach ($logStates as $state) {
            FeedingLog::factory()->for($dog)->create(array_merge($state, [
                'unit'      => 'cup',
                'fed_at'    => Carbon::parse($state['fed_at']),
                'feed_time' => '07:00',
            ]));
        }

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', $expected);
    }

    /**
     * A log whose feed_time is no longer in the dog's current schedule
     * appears as an extra.
     *
     * @return void
     */
    public function test_orphaned_feed_time_becomes_extra(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('today 09:00'),
            'feed_time' => '09:00',
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.0.logs', [])
            ->assertJsonCount(1, 'data.0.feedings.extras');
    }
}
