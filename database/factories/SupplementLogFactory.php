<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\SupplementLog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupplementLog>
 */
class SupplementLogFactory extends Factory
{
    /** @var class-string<SupplementLog> */
    protected $model = SupplementLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dog_id'            => Dog::factory(),
            'dog_supplement_id' => DogSupplement::factory(),
            'amount_given'      => fake()->randomFloat(2, 0.5, 2),
            'unit'              => fake()->randomElement(['mg', 'mL', 'capsule', 'pump', 'tablet']),
            'given_at'          => now(),
            'was_skipped'       => false,
            'skip_reason'       => null,
            'notes'             => null,
        ];
    }

    /**
     * @return static
     */
    public function skipped(): static
    {
        return $this->state(fn (): array => [
            'amount_given' => 0,
            'was_skipped'  => true,
            'skip_reason'  => "wouldn't take it",
        ]);
    }
}
