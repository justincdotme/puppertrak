<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimestampTimezoneTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_feeding_log_with_utc_suffix_stores_app_local_time(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'food_id' => $food->id,
            'amount'  => '1.00',
            'unit'    => 'cup',
            'fed_at'  => '2026-09-07T16:40:00Z',
        ]);

        $response->assertCreated();

        // 16:40 UTC = 09:40 PDT (America/Los_Angeles is UTC-7 in September)
        $this->assertDatabaseHas('feeding_logs', [
            'id'     => $response->json('data.id'),
            'fed_at' => '2026-09-07 09:40:00',
        ]);

        $this->assertSame('2026-09-07T09:40:00-07:00', $response->json('data.fed_at'));
    }

    /**
     * @return void
     */
    public function test_feeding_log_without_timezone_stores_unchanged(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'food_id' => $food->id,
            'amount'  => '1.00',
            'unit'    => 'cup',
            'fed_at'  => '2026-09-07 09:40:00',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('feeding_logs', [
            'id'     => $response->json('data.id'),
            'fed_at' => '2026-09-07 09:40:00',
        ]);
    }

    /**
     * @return void
     */
    public function test_supplement_log_with_utc_suffix_stores_app_local_time(): void
    {
        $dog        = Dog::factory()->create();
        $assignment = DogSupplement::factory()->for($dog)->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplement-logs", [
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => '1.00',
            'unit'              => 'tablet',
            'given_at'          => '2026-09-07T16:40:00Z',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('supplement_logs', [
            'id'       => $response->json('data.id'),
            'given_at' => '2026-09-07 09:40:00',
        ]);

        $this->assertSame('2026-09-07T09:40:00-07:00', $response->json('data.given_at'));
    }

    /**
     * @return void
     */
    public function test_supplement_log_without_timezone_stores_unchanged(): void
    {
        $dog        = Dog::factory()->create();
        $assignment = DogSupplement::factory()->for($dog)->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplement-logs", [
            'dog_supplement_id' => $assignment->id,
            'amount_given'      => '1.00',
            'unit'              => 'tablet',
            'given_at'          => '2026-09-07 09:40:00',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('supplement_logs', [
            'id'       => $response->json('data.id'),
            'given_at' => '2026-09-07 09:40:00',
        ]);
    }

    /**
     * @return void
     */
    public function test_health_note_with_utc_suffix_stores_app_local_time(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/health-notes", [
            'body'     => 'Vomited after dinner',
            'noted_at' => '2026-09-07T16:40:00Z',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('health_notes', [
            'id'       => $response->json('data.id'),
            'noted_at' => '2026-09-07 09:40:00',
        ]);

        $this->assertSame('2026-09-07T09:40:00-07:00', $response->json('data.noted_at'));
    }
}
