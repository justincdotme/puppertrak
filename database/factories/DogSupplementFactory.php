<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DogSupplement>
 */
class DogSupplementFactory extends Factory
{
    /** @var class-string<DogSupplement> */
    protected $model = DogSupplement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dog_id'        => Dog::factory(),
            'supplement_id' => Supplement::factory(),
            'dose'          => fake()->randomFloat(2, 0.5, 2),
            'unit'          => fake()->randomElement(['mg', 'mL', 'capsule', 'pump', 'tablet']),
            'times'         => ['07:00'],
            'notes'         => null,
        ];
    }

    /**
     * @return static
     */
    public function asNeeded(): static
    {
        return $this->state(fn (): array => ['times' => null]);
    }
}
