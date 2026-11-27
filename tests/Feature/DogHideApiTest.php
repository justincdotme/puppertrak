<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\FeedingLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DogHideApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * @return array<string, array{hideAt: string, unhideAt: string, now: string, statuses: list<string>, missed: bool}>
     */
    public static function hiddenWindowCases(): array
    {
        return [
            'slot missed before hiding stays overdue' => [
                'hideAt'   => 'today 09:30',
                'unhideAt' => 'today 09:40',
                'now'      => 'today 09:40',
                'statuses' => ['overdue', 'upcoming', 'upcoming'],
                'missed'   => true,
            ],
            'slots inside the hidden window are untracked' => [
                'hideAt'   => 'today 06:30',
                'unhideAt' => 'today 14:30',
                'now'      => 'today 14:30',
                'statuses' => ['untracked', 'untracked', 'upcoming'],
                'missed'   => false,
            ],
            'hidden since yesterday covers today from midnight' => [
                'hideAt'   => 'yesterday 20:00',
                'unhideAt' => 'today 14:30',
                'now'      => 'today 14:30',
                'statuses' => ['untracked', 'untracked', 'upcoming'],
                'missed'   => false,
            ],
            'mid-day window leaves the earlier missed slot flagged' => [
                'hideAt'   => 'today 10:00',
                'unhideAt' => 'today 14:30',
                'now'      => 'today 14:30',
                'statuses' => ['overdue', 'untracked', 'upcoming'],
                'missed'   => true,
            ],
            'window from yesterday does not affect today' => [
                'hideAt'   => 'yesterday 06:00',
                'unhideAt' => 'yesterday 20:00',
                'now'      => 'today 14:30',
                'statuses' => ['overdue', 'overdue', 'upcoming'],
                'missed'   => true,
            ],
        ];
    }

    /**
     * @return void
     */
    public function test_hiding_a_dog_excludes_it_from_the_index(): void
    {
        $dog = Dog::factory()->create();

        $this->postJson("/api/dogs/{$dog->slug}/hide")->assertOk();
        $this->getJson('/api/dogs')->assertJsonMissing(['slug' => $dog->slug]);
    }

    /**
     * @return void
     */
    public function test_include_hidden_param_shows_hidden_dogs_in_the_index(): void
    {
        $visible = Dog::factory()->create(['name' => 'Visible']);
        $hidden  = Dog::factory()->hidden()->create(['name' => 'Hidden']);

        $response = $this->getJson('/api/dogs?include_hidden=1');

        $response->assertOk()
            ->assertJsonFragment(['slug' => $visible->slug])
            ->assertJsonFragment(['slug' => $hidden->slug]);
    }

    /**
     * @return void
     */
    public function test_hidden_dog_excluded_from_dashboard(): void
    {
        Carbon::setTestNow(Carbon::parse('today 12:00'));
        Dog::factory()->create(['name' => 'Active']);
        Dog::factory()->hidden()->create(['name' => 'Hidden']);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.dog.name', 'Active');
    }

    /**
     * @return void
     */
    public function test_unhiding_restores_a_dog_to_the_index(): void
    {
        $dog = Dog::factory()->hidden()->create();

        $this->postJson("/api/dogs/{$dog->slug}/unhide")
            ->assertOk()
            ->assertJsonPath('data.hidden_at', null);

        $this->getJson('/api/dogs')->assertJsonFragment(['slug' => $dog->slug]);
    }

    /**
     * @return void
     */
    public function test_unhiding_preserves_history(): void
    {
        Carbon::setTestNow(Carbon::parse('today 06:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00'],
            'created_at' => now()->subDays(2),
        ]);
        FeedingLog::factory()->for($dog)->create([
            'amount'    => 1,
            'fed_at'    => Carbon::parse('yesterday 07:30'),
            'feed_time' => '07:00',
        ]);

        $dog->update(['hidden_at' => now()]);

        Carbon::setTestNow(Carbon::parse('today 08:00'));
        $dog->update(['hidden_at' => null, 'tracking_resumed_at' => now()]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/history?days=7");

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    /**
     * Meal slots that passed while the dog was hidden should not trigger
     * a missed meal alert after un-hiding.
     *
     * @return void
     */
    public function test_no_missed_meal_for_slots_that_passed_while_hidden(): void
    {
        Carbon::setTestNow(Carbon::parse('today 06:00'));
        $dog = Dog::factory()->create([
            'feed_times' => ['07:00', '18:00'],
            'created_at' => now()->subDays(2),
        ]);

        $dog->update(['hidden_at' => Carbon::parse('today 06:30')]);

        Carbon::setTestNow(Carbon::parse('today 14:00'));
        $this->postJson("/api/dogs/{$dog->slug}/unhide")->assertOk();

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk()
            ->assertJsonPath('data.feedings.schedule.0.status', 'untracked')
            ->assertJsonPath('data.feedings.schedule.1.status', 'upcoming')
            ->assertJsonPath('data.alerts.feeding_missed', false);
    }

    /**
     * @return void
     */
    public function test_no_overdue_supplement_for_times_that_passed_while_hidden(): void
    {
        Carbon::setTestNow(Carbon::parse('today 06:00'));
        $dog = Dog::factory()->create([
            'feed_times' => null,
            'created_at' => now()->subDays(2),
        ]);
        DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00', '18:00'],
            'created_at' => now()->subDays(2),
        ]);

        $dog->update(['hidden_at' => Carbon::parse('today 06:30')]);

        Carbon::setTestNow(Carbon::parse('today 14:00'));
        $this->postJson("/api/dogs/{$dog->slug}/unhide")->assertOk();

        $response = $this->getJson("/api/dogs/{$dog->slug}/today");

        $response->assertOk()
            ->assertJsonPath('data.alerts.supplements_overdue', false)
            ->assertJsonPath('data.supplements.overdue', 0);
    }

    /**
     * @param string       $hideAt   When the dog is hidden.
     * @param string       $unhideAt When the dog is unhidden.
     * @param string       $now      Clock time for the today request.
     * @param list<string> $statuses Expected statuses for 07:00, 12:00, 18:00.
     * @param boolean      $missed   Expected missed and overdue alerts.
     *
     * @return void
     */
    #[DataProvider('hiddenWindowCases')]
    public function test_only_slots_inside_the_hidden_window_are_untracked(
        string $hideAt,
        string $unhideAt,
        string $now,
        array $statuses,
        bool $missed,
    ): void {
        $times = ['07:00', '12:00', '18:00'];

        Carbon::setTestNow(Carbon::parse('2026-11-20 12:00'));
        $hiddenAt   = Carbon::parse($hideAt);
        $unhiddenAt = Carbon::parse($unhideAt);
        $requestAt  = Carbon::parse($now);

        Carbon::setTestNow(Carbon::parse('2026-11-18 00:00'));
        $dog = Dog::factory()->create(['feed_times' => $times]);
        DogSupplement::factory()->for($dog)->create(['times' => $times]);

        Carbon::setTestNow($hiddenAt);
        $this->postJson("/api/dogs/{$dog->slug}/hide")->assertOk();

        Carbon::setTestNow($unhiddenAt);
        $this->postJson("/api/dogs/{$dog->slug}/unhide")->assertOk();

        Carbon::setTestNow($requestAt);
        $response = $this->getJson("/api/dogs/{$dog->slug}/today")->assertOk();

        $this->assertSame($statuses, array_column($response->json('data.feedings.schedule'), 'status'));
        $this->assertSame($statuses, array_column($response->json('data.supplements.schedule'), 'status'));
        $response->assertJsonPath('data.alerts.feeding_missed', $missed)
            ->assertJsonPath('data.alerts.supplements_overdue', $missed);
    }

    /**
     * Re-hiding must not move the start of the hidden window, or slots missed
     * early in that window would come back as overdue after un-hiding.
     *
     * @return void
     */
    public function test_hiding_an_already_hidden_dog_keeps_the_original_hidden_time(): void
    {
        Carbon::setTestNow(Carbon::parse('today 06:00'));
        $dog = Dog::factory()->create();
        $this->postJson("/api/dogs/{$dog->slug}/hide")->assertOk();

        Carbon::setTestNow(Carbon::parse('today 09:00'));
        $this->postJson("/api/dogs/{$dog->slug}/hide")->assertOk();

        $this->assertTrue($dog->fresh()?->hidden_at?->equalTo(Carbon::parse('today 06:00')));
    }

    /**
     * @return void
     */
    public function test_unhiding_a_visible_dog_leaves_tracking_untouched(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-18 00:00'));
        $dog = Dog::factory()->create(['feed_times' => ['07:00']]);
        DogSupplement::factory()->for($dog)->create(['times' => ['07:00']]);

        Carbon::setTestNow(Carbon::parse('2026-11-20 09:40'));
        $this->postJson("/api/dogs/{$dog->slug}/unhide")
            ->assertOk()
            ->assertJsonPath('data.hidden_at', null);

        $dog->refresh();
        $this->assertNull($dog->tracking_paused_at);
        $this->assertNull($dog->tracking_resumed_at);

        $this->getJson("/api/dogs/{$dog->slug}/today")
            ->assertOk()
            ->assertJsonPath('data.feedings.schedule.0.status', 'overdue')
            ->assertJsonPath('data.supplements.schedule.0.status', 'overdue');
    }

    /**
     * @return void
     */
    public function test_archive_behavior_unchanged_by_hide_feature(): void
    {
        $dog = Dog::factory()->create();

        $this->postJson("/api/dogs/{$dog->slug}/archive")->assertOk();
        $this->getJson('/api/dogs')->assertJsonMissing(['slug' => $dog->slug]);
        $this->getJson('/api/dogs?archived=1')->assertJsonFragment(['slug' => $dog->slug]);

        $this->postJson("/api/dogs/{$dog->slug}/unarchive")
            ->assertOk()
            ->assertJsonPath('data.archived_at', null);

        $this->getJson('/api/dogs')->assertJsonFragment(['slug' => $dog->slug]);
    }

    /**
     * @return void
     */
    public function test_hide_endpoint_sets_hidden_at(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-25 10:00:00'));
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/hide");

        $response->assertOk();
        $this->assertNotNull($response->json('data.hidden_at'));
    }

    /**
     * @return void
     */
    public function test_hidden_dog_excluded_from_include_hidden_when_archived(): void
    {
        $dog = Dog::factory()->create();
        $dog->update(['archived_at' => now(), 'hidden_at' => now()]);

        $response = $this->getJson('/api/dogs?include_hidden=1');

        $response->assertOk()->assertJsonMissing(['slug' => $dog->slug]);
    }
}
