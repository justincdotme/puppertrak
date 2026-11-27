<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Food;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Food>
 */
class FoodFactory extends Factory
{
    /** @var class-string<Food> */
    protected $model = Food::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Purina Pro Plan Sensitive Skin',
                'Wellness CORE Small Breed',
                'Ziwi Peak Air-Dried',
                'Blue Buffalo Life Protection',
                "Hill's Science Diet",
            ]),
            'bag_description' => fake()->optional()->sentence(),
            'notes'           => null,
        ];
    }
}
