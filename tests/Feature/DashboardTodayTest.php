<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\FeedingLog;
use App\Models\HealthNote;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTodayTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_no_warning_before_a_feed_window_closes(): void
    {
        Carbon::setTestNow(Carbon::parse('today 08:00'));
        Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'upcoming');
    }

    /**
     * @return void
     */
    public function test_first_miss_is_overdue_without_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('today 09:01'));
        Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->startOfDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'upcoming');
    }

    /**
     * @return void
     */
    public function test_log_inside_the_window_satisfies_the_time(): void
    {
        Carbon::setTestNow(Carbon::parse('today 10:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount' => 1,
            'fed_at' => Carbon::parse('today 07:40'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed');
    }

    /**
     * @return void
     */
    public function test_skip_log_satisfies_the_time_without_warning(): void
    {
        Carbon::setTestNow(Carbon::parse('today 10:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'      => 0,
            'was_skipped' => true,
            'skip_reason' => "wouldn't eat",
            'fed_at'      => Carbon::parse('today 07:15'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'skipped');
    }

    /**
     * @return void
     */
    public function test_log_outside_every_window_is_an_extra_and_clears_nothing(): void
    {
        Carbon::setTestNow(Carbon::parse('today 13:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount' => 0.25,
            'fed_at' => Carbon::parse('today 12:00'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonCount(1, 'data.0.feedings.extras');
    }

    /**
     * @return void
     */
    public function test_logs_match_the_nearest_unsatisfied_time(): void
    {
        Carbon::setTestNow(Carbon::parse('today 11:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '10:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount' => 1,
            'fed_at' => Carbon::parse('today 08:30'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'upcoming');
    }

    /**
     * @return void
     */
    public function test_dog_without_feed_times_never_warns(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        Dog::factory()->create(['feed_times' => null]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.expected', 0)
            ->assertJsonPath('data.0.alerts.feedings_overdue', false);
    }

    /**
     * A log timestamped before midnight belongs to yesterday's partition, not
     * today's. Without day partitioning the log would satisfy today's 00:30
     * window (it falls inside the variance range), breaking the two-miss streak
     * and flipping the alert to false.
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
            'amount' => 1,
            'fed_at' => Carbon::parse('yesterday 23:30'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', true)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue');
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
            ->assertJsonPath('data.0.alerts.feedings_overdue', false);
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
            'noted_at' => now()->subHours(2),
        ]);
        HealthNote::factory()->for($dog)->create([
            'noted_at' => now()->subHours(30),
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
    public function test_two_consecutive_misses_today_triggers_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:01'));
        Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', true)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.feedings.overdue', 2);
    }

    /**
     * @return void
     */
    public function test_cross_day_miss_streak_triggers_alert(): void
    {
        Carbon::setTestNow(Carbon::parse('today 09:01'));
        Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', true)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.overdue', 1);
    }

    /**
     * @return void
     */
    public function test_fed_window_breaks_miss_streak(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDays(2),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount' => 1,
            'fed_at' => Carbon::parse('today 07:30'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue')
            ->assertJsonPath('data.0.feedings.overdue', 1);
    }

    /**
     * @return void
     */
    public function test_skip_log_breaks_miss_streak(): void
    {
        Carbon::setTestNow(Carbon::parse('today 09:01'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDay(),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'      => 0,
            'was_skipped' => true,
            'skip_reason' => 'sick',
            'fed_at'      => Carbon::parse('yesterday 18:15'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.overdue', 1);
    }

    /**
     * A dog created mid-day has no window for feed times earlier that day -
     * they never existed, so they are absent from the schedule entirely
     * rather than showing up as overdue rows.
     *
     * @return void
     */
    public function test_windows_before_dog_creation_are_ineligible(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.alerts.feedings_overdue', false)
            ->assertJsonPath('data.0.feedings.expected', 1)
            ->assertJsonCount(1, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.feedings.schedule.0.time', '18:00')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.overdue', 1);
    }
}
