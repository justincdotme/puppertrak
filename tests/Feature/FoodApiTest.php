<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\FeedingLog;
use App\Models\FeedingPlan;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FoodApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_index_lists_foods(): void
    {
        Food::factory()->count(3)->create();

        $this->getJson('/api/foods')->assertOk()->assertJsonCount(3, 'data');
    }

    /**
     * @return void
     */
    public function test_a_food_can_be_created(): void
    {
        $response = $this->postJson('/api/foods', [
            'name'            => 'Purina Pro Plan Sensitive Skin',
            'bag_description' => '30 lb bag',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Purina Pro Plan Sensitive Skin')
            ->assertJsonPath('data.bag_description', '30 lb bag');
    }

    /**
     * @return void
     */
    public function test_a_food_can_be_updated(): void
    {
        $food = Food::factory()->create(['name' => 'Old Name']);

        $response = $this->putJson("/api/foods/{$food->id}", ['name' => 'New Name']);

        $response->assertOk()->assertJsonPath('data.name', 'New Name');
    }

    /**
     * @return void
     */
    public function test_a_food_name_is_required(): void
    {
        $response = $this->postJson('/api/foods', []);

        $response->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    /**
     * @return void
     */
    public function test_deleting_a_food_still_on_a_plan_is_rejected(): void
    {
        $plan = FeedingPlan::factory()->create();

        $this->deleteJson("/api/foods/{$plan->food_id}")->assertUnprocessable();
        $this->assertNull(Food::find($plan->food_id)->deleted_at);
    }

    /**
     * @return void
     */
    public function test_deleting_an_unassigned_food_soft_deletes_it(): void
    {
        $food = Food::factory()->create();
        FeedingLog::factory()->create(['food_id' => $food->id]);

        $this->deleteJson("/api/foods/{$food->id}")->assertNoContent();
        $this->assertSoftDeleted('foods', ['id' => $food->id]);
        $this->getJson('/api/foods')->assertJsonMissing(['id' => $food->id]);
    }
}
