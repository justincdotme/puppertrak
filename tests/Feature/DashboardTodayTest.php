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
     * Pre-anchor windows appear in the schedule as "untracked" and are
     * excluded from expected, overdue, and the alert.
     *
     * @return void
     */
    public function test_pre_anchor_window_shows_untracked_and_expected_excludes_it(): void
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
            ->assertJsonPath('data.0.feedings.expected', 1)
            ->assertJsonPath('data.0.feedings.overdue', 1)
            ->assertJsonPath('data.0.alerts.feedings_overdue', false);
    }

    /**
     * @return void
     */
    public function test_log_matching_untracked_window_flips_to_fed_and_increments_expected(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        $dog = Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);
        FeedingLog::factory()->for($dog)->create([
            'amount' => 1,
            'fed_at' => Carbon::parse('today 07:30'),
        ]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'fed')
            ->assertJsonPath('data.0.feedings.expected', 2)
            ->assertJsonPath('data.0.feedings.fed', 1);
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
        ]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'skipped')
            ->assertJsonPath('data.0.feedings.expected', 2)
            ->assertJsonPath('data.0.feedings.skipped', 1);
    }

    /**
     * A dog created at 20:00 with 07:00/18:00 feed times shows zero
     * overdue and no alert. This is the original day-one protection.
     *
     * @return void
     */
    public function test_untracked_windows_produce_no_overdue_on_day_one(): void
    {
        Carbon::setTestNow(Carbon::parse('today 20:00'));
        Dog::factory()->create(['feed_times' => ['07:00', '18:00']]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(2, 'data.0.feedings.schedule')
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'untracked')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'untracked')
            ->assertJsonPath('data.0.feedings.expected', 0)
            ->assertJsonPath('data.0.feedings.overdue', 0)
            ->assertJsonPath('data.0.alerts.feedings_overdue', false);
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
            ->assertJsonPath('data.0.feedings.schedule.2.status', 'overdue')
            ->assertJsonPath('data.0.feedings.expected', 1);
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
            ->assertJsonPath('data.0.feedings.expected', 2)
            ->assertJsonPath('data.0.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.feedings.schedule.1.status', 'overdue');
    }

    /**
     * The miss streak only considers at-or-after-anchor windows, so a dog
     * created mid-day cannot accumulate two consecutive misses from
     * pre-anchor times.
     *
     * @return void
     */
    public function test_streak_ignores_pre_anchor_windows(): void
    {
        Carbon::setTestNow(Carbon::parse('today 15:00'));
        Dog::factory()->create(['feed_times' => ['07:00', '12:00', '18:00']]);

        Carbon::setTestNow(Carbon::parse('today 20:01'));
        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.feedings.overdue', 1)
            ->assertJsonPath('data.0.alerts.feedings_overdue', false);
    }
}
