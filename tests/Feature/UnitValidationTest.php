<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UnitValidationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_creating_a_feeding_plan_without_unit_returns_422(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-plans", [
            'food_id' => $food->id,
            'amount'  => '1.00',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('unit');
    }

    /**
     * @return void
     */
    public function test_creating_a_feeding_log_without_unit_returns_422(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'food_id' => $food->id,
            'amount'  => '1.00',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('unit');
    }

    /**
     * @return void
     */
    public function test_feeding_plan_persists_custom_unit_without_coercion(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-plans", [
            'food_id' => $food->id,
            'amount'  => '0.75',
            'unit'    => 'scoop',
        ]);

        $response->assertCreated()->assertJsonPath('data.unit', 'scoop');
        $this->assertDatabaseHas('feeding_plans', [
            'dog_id' => $dog->id,
            'unit'   => 'scoop',
        ]);
    }

    /**
     * @return void
     */
    public function test_dog_index_includes_feeding_plans_and_dog_supplements_keys(): void
    {
        Dog::factory()->create();

        $response = $this->getJson('/api/dogs');

        $response->assertOk();
        $dog = $response->json('data.0');
        $this->assertArrayHasKey('feeding_plans', $dog);
        $this->assertArrayHasKey('dog_supplements', $dog);
        $this->assertSame([], $dog['feeding_plans']);
        $this->assertSame([], $dog['dog_supplements']);
    }

    /**
     * @return void
     */
    public function test_dog_show_includes_feeding_plans_and_dog_supplements_keys(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->getJson("/api/dogs/{$dog->slug}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertArrayHasKey('feeding_plans', $data);
        $this->assertArrayHasKey('dog_supplements', $data);
        $this->assertSame([], $data['feeding_plans']);
        $this->assertSame([], $data['dog_supplements']);
    }
}
