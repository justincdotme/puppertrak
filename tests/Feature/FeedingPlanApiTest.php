<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\FeedingPlan;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeedingPlanApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_index_lists_a_dogs_feeding_plans(): void
    {
        $dog = Dog::factory()->create();
        FeedingPlan::factory()->for($dog)->count(2)->create();

        $this->getJson("/api/dogs/{$dog->slug}/feeding-plans")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    /**
     * @return void
     */
    public function test_a_feeding_plan_can_be_created_for_a_dog(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create(['name' => 'Wellness CORE Small Breed']);

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-plans", [
            'food_id' => $food->id,
            'amount'  => '0.75',
            'unit'    => 'cup',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.food_id', $food->id)
            ->assertJsonPath('data.food_name', 'Wellness CORE Small Breed')
            ->assertJsonPath('data.amount', '0.75');
    }

    /**
     * @return void
     */
    public function test_food_id_must_exist_when_creating_a_plan(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-plans", [
            'food_id' => 999,
            'amount'  => '1.00',
            'unit'    => 'cup',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('food_id');
    }

    /**
     * @return void
     */
    public function test_a_feeding_plan_can_be_updated(): void
    {
        $plan = FeedingPlan::factory()->create(['amount' => '1.00']);

        $response = $this->putJson("/api/feeding-plans/{$plan->id}", ['amount' => '1.50']);

        $response->assertOk()->assertJsonPath('data.amount', '1.50');
    }

    /**
     * @return void
     */
    public function test_a_feeding_plan_can_be_deleted(): void
    {
        $plan = FeedingPlan::factory()->create();

        $this->deleteJson("/api/feeding-plans/{$plan->id}")->assertNoContent();
        $this->assertDatabaseMissing('feeding_plans', ['id' => $plan->id]);
    }
}
