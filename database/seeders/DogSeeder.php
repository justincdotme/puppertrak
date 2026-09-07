<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Dog;
use Illuminate\Database\Seeder;

class DogSeeder extends Seeder
{
    /**
     * @return void
     */
    public function run(): void
    {
        Dog::updateOrCreate(
            ['slug' => 'maple'],
            [
                'name'                  => 'Maple',
                'breed'                 => 'Golden Retriever',
                'date_of_birth'         => '2020-04-12',
                'sex'                   => 'female',
                'is_neutered_or_spayed' => true,
                'weight'                => '62.00',
                'weight_unit'           => 'lb',
                'color_markings'        => 'Golden with a white chest patch',
                'microchip_number'      => '985112345678901',
                'rabies_vaccine_date'   => '2026-02-01',
                'da2pp_vaccine_date'    => '2026-02-01',
                'primary_vet_name'      => 'Dr. Patel',
                'primary_vet_phone'     => '555-0101',
                'primary_vet_address'   => '100 Oak St, Springfield',
                'emergency_vet_name'    => 'Springfield Emergency Vet',
                'emergency_vet_phone'   => '555-0199',
                'emergency_vet_address' => '900 Emergency Way, Springfield',
                'owner_name'            => 'Justin Christenson',
                'owner_phone'           => '555-0110',
                'feed_times'            => ['07:00', '18:00'],
            ],
        );

        Dog::updateOrCreate(
            ['slug' => 'biscuit'],
            [
                'name'                  => 'Biscuit',
                'breed'                 => 'French Bulldog',
                'date_of_birth'         => '2021-09-03',
                'sex'                   => 'male',
                'is_neutered_or_spayed' => true,
                'weight'                => '24.00',
                'weight_unit'           => 'lb',
                'color_markings'        => 'Fawn with black mask',
                'microchip_number'      => '985112345678902',
                'rabies_vaccine_date'   => '2026-03-15',
                'da2pp_vaccine_date'    => '2026-03-15',
                'primary_vet_name'      => 'Dr. Patel',
                'primary_vet_phone'     => '555-0101',
                'primary_vet_address'   => '100 Oak St, Springfield',
                'emergency_vet_name'    => 'Springfield Emergency Vet',
                'emergency_vet_phone'   => '555-0199',
                'emergency_vet_address' => '900 Emergency Way, Springfield',
                'owner_name'            => "Justin's parents",
                'owner_phone'           => '555-0120',
                'feed_times'            => ['07:30', '18:30'],
            ],
        );
    }
}
