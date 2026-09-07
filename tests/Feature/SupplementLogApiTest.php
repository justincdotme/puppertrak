<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplementLogApiTest extends TestCase
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
    public function test_index_filters_by_dog_and_date_range(): void
    {
        $dog   = Dog::factory()->create();
        $other = Dog::factory()->create();
        SupplementLog::factory()->for($dog)->create(['given_at' => Carbon::parse('2026-09-01 08:00')]);
        SupplementLog::factory()->for($dog)->create(['given_at' => Carbon::parse('2026-09-05 08:00')]);
        SupplementLog::factory()->for($other)->create(['given_at' => Carbon::parse('2026-09-05 08:00')]);

        $response = $this->getJson("/api/supplement-logs?dog={$dog->slug}&from=2026-09-03&to=2026-09-06");

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    /**
     * @return void
     */
    public function test_skip_reason_is_required_when_amount_given_is_zero(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplement-logs", [
            'amount_given' => 0,
            'unit'         => 'pump',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('skip_reason');
    }

    /**
     * @return void
     */
    public function test_store_defaults_given_at_to_now(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 09:00:00'));
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplement-logs", [
            'amount_given' => 1,
            'unit'         => 'pump',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('supplement_logs', ['dog_id' => $dog->id, 'given_at' => '2026-09-07 09:00:00']);
    }

    /**
     * @return void
     */
    public function test_a_dog_supplement_id_must_belong_to_the_bound_dog(): void
    {
        $dog             = Dog::factory()->create();
        $otherAssignment = DogSupplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplement-logs", [
            'dog_supplement_id' => $otherAssignment->id,
            'amount_given'      => 1,
            'unit'              => 'pump',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('dog_supplement_id');
    }

    /**
     * @return void
     */
    public function test_update_edits_a_log(): void
    {
        $log = SupplementLog::factory()->create(['amount_given' => 1]);

        $response = $this->putJson("/api/supplement-logs/{$log->id}", [
            'amount_given' => 2,
            'unit'         => $log->unit,
        ]);

        $response->assertOk()->assertJsonPath('data.amount_given', '2.00');
    }

    /**
     * @return void
     */
    public function test_destroy_removes_a_log(): void
    {
        $log = SupplementLog::factory()->create();

        $this->deleteJson("/api/supplement-logs/{$log->id}")->assertNoContent();
        $this->assertDatabaseMissing('supplement_logs', ['id' => $log->id]);
    }
}
