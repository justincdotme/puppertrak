<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use App\Models\FeedingLog;
use App\Models\Food;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FeedingLog>
 */
class FeedingLogFactory extends Factory
{
    /** @var class-string<FeedingLog> */
    protected $model = FeedingLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dog_id'      => Dog::factory(),
            'food_id'     => Food::factory(),
            'amount'      => fake()->randomFloat(2, 0.25, 2),
            'unit'        => fake()->randomElement(['cup', 'g', 'oz', 'scoop']),
            'fed_at'      => now(),
            'feed_time'   => null,
            'was_skipped' => false,
            'skip_reason' => null,
            'notes'       => null,
        ];
    }

    /**
     * @return static
     */
    public function skipped(): static
    {
        return $this->state(fn (): array => [
            'amount'      => 0,
            'was_skipped' => true,
            'skip_reason' => "wouldn't eat",
        ]);
    }
}
