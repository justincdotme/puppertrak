<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Dog;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dog>
 */
class DogFactory extends Factory
{
    /** @var class-string<Dog> */
    protected $model = Dog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name'                  => fake()->randomElement(['Maple', 'Biscuit', 'Charlie', 'Luna', 'Rosie', 'Bear', 'Daisy', 'Cooper']),
            'breed'                 => fake()->randomElement(['Golden Retriever', 'French Bulldog', 'Labrador Retriever', 'Beagle', 'Poodle']),
            'date_of_birth'         => fake()->boolean(70) ? fake()->dateTimeBetween('-10 years', '-1 year')->format('Y-m-d') : null,
            'age_years'             => null,
            'sex'                   => fake()->randomElement(['male', 'female']),
            'is_neutered_or_spayed' => fake()->boolean(80),
            'weight'                => fake()->randomFloat(2, 8, 90),
            'weight_unit'           => 'lb',
            'color_markings'        => fake()->optional()->words(2, true),
            'microchip_number'      => fake()->optional()->numerify('###############'),
            'rabies_vaccine_date'   => fake()->boolean(70) ? fake()->dateTimeBetween('-1 year')->format('Y-m-d') : null,
            'da2pp_vaccine_date'    => fake()->boolean(70) ? fake()->dateTimeBetween('-1 year')->format('Y-m-d') : null,
            'other_vaccines'        => null,
            'allergies'             => null,
            'medical_conditions'    => null,
            'current_medications'   => null,
            'primary_vet_name'      => fake()->optional()->name(),
            'primary_vet_phone'     => fake()->optional()->phoneNumber(),
            'primary_vet_address'   => fake()->optional()->address(),
            'emergency_vet_name'    => fake()->optional()->name(),
            'emergency_vet_phone'   => fake()->optional()->phoneNumber(),
            'emergency_vet_address' => fake()->optional()->address(),
            'owner_name'            => fake()->name(),
            'owner_phone'           => fake()->phoneNumber(),
            'notes'                 => null,
            'feed_times'            => ['07:00', '18:00'],
            'archived_at'           => null,
        ];
    }

    /**
     * @return static
     */
    public function archived(): static
    {
        return $this->state(fn (): array => ['archived_at' => now()]);
    }
}
