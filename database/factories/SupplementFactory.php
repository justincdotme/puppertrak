<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Supplement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Supplement>
 */
class SupplementFactory extends Factory
{
    /** @var class-string<Supplement> */
    protected $model = Supplement::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name'         => fake()->unique()->randomElement(['Fish oil', 'Cosequin', 'FortiFlora', 'Carprofen', 'Glucosamine chew']),
            'default_unit' => fake()->randomElement(['mg', 'mL', 'capsule', 'pump', 'tablet']),
            'notes'        => null,
        ];
    }
}
