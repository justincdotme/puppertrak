<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplementTodayTest extends TestCase
{
    use RefreshDatabase;

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
     * @return void
     */
    public function test_supplement_log_outside_closed_window_leaves_overdue(): void
    {
        Carbon::setTestNow(Carbon::parse('today 14:00'));
        $dog        = Dog::factory()->create(['feed_times' => null]);
        $assignment = DogSupplement::factory()->for($dog)->create([
            'times'      => ['07:00'],
            'created_at' => now()->subDay(),
        ]);
        SupplementLog::factory()->for($dog)->create([
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => 1,
            'given_at'          => Carbon::parse('today 13:00'),
        ]);

        $response = $this->getJson('/api/dashboard/today');

        $response->assertOk()
            ->assertJsonPath('data.0.supplements.schedule.0.status', 'overdue')
            ->assertJsonPath('data.0.supplements.handled', 0)
            ->assertJsonPath('data.0.alerts.supplements_overdue', true);

        $supplements = $response->json('data.0.supplements');
        $this->assertArrayNotHasKey('extras', $supplements);
    }

    /**
     * An assignment created mid-day has no window for times earlier that day
     * - it cannot be overdue for a time it was never scheduled to cover yet.
     *
     * @return void
     */
    public function test_windows_before_assignment_creation_are_ineligible(): void
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
            ->assertJsonCount(1, 'data.0.supplements.schedule')
            ->assertJsonPath('data.0.supplements.schedule.0.time', '18:00')
            ->assertJsonPath('data.0.supplements.overdue', 1)
            ->assertJsonPath('data.0.alerts.supplements_overdue', true);
    }
}
