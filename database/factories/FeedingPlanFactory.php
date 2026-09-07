<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use App\Models\FeedingPlan;
use App\Models\Food;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FeedingPlan>
 */
class FeedingPlanFactory extends Factory
{
    /** @var class-string<FeedingPlan> */
    protected $model = FeedingPlan::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dog_id'  => Dog::factory(),
            'food_id' => Food::factory(),
            'amount'  => fake()->randomFloat(2, 0.25, 2),
            'unit'    => fake()->randomElement(['cup', 'g', 'oz', 'scoop']),
            'notes'   => null,
        ];
    }
}
