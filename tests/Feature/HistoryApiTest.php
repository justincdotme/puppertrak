<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\FeedingLog;
use App\Models\Food;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HistoryApiTest extends TestCase
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
     * @return void
     */
    public function test_history_groups_feeding_and_supplement_logs_by_day_desc(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 12:00:00'));
        $dog = Dog::factory()->create();
        FeedingLog::factory()->for($dog)->create(['fed_at' => Carbon::parse('2026-09-07 07:00:00')]);
        SupplementLog::factory()->for($dog)->create(['given_at' => Carbon::parse('2026-09-07 08:00:00')]);
        FeedingLog::factory()->for($dog)->create(['fed_at' => Carbon::parse('2026-09-06 07:00:00')]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/history");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.date', '2026-09-07')
            ->assertJsonCount(2, 'data.0.entries')
            ->assertJsonPath('data.0.entries.0.type', 'supplement')
            ->assertJsonPath('data.0.entries.1.type', 'feeding')
            ->assertJsonPath('data.1.date', '2026-09-06');
    }

    /**
     * @return void
     */
    public function test_days_param_excludes_logs_outside_the_window(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 12:00:00'));
        $dog = Dog::factory()->create();
        FeedingLog::factory()->for($dog)->create(['fed_at' => Carbon::parse('2026-09-01 07:00:00')]);
        FeedingLog::factory()->for($dog)->create(['fed_at' => Carbon::parse('2026-09-06 07:00:00')]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/history?days=2");

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    /**
     * @return void
     */
    public function test_entries_carry_the_food_and_supplement_names(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create(['name' => 'Pro Plan']);
        FeedingLog::factory()->for($dog)->create(['food_id' => $food->id]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/history");

        $response->assertOk()->assertJsonPath('data.0.entries.0.food_name', 'Pro Plan');
    }
}
