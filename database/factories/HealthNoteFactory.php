<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use App\Models\HealthNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HealthNote>
 */
class HealthNoteFactory extends Factory
{
    /** @var class-string<HealthNote> */
    protected $model = HealthNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dog_id'      => Dog::factory(),
            'occurred_at' => now(),
            'title'       => fake()->optional()->words(3, true),
            'body'        => fake()->sentence(),
        ];
    }
}
