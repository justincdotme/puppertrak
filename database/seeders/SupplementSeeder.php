<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use Illuminate\Database\Seeder;

class SupplementSeeder extends Seeder
{
    /**
     * @return void
     */
    public function run(): void
    {
        $fishOil = Supplement::updateOrCreate(
            ['name' => 'Fish oil'],
            ['default_unit' => 'pump'],
        );

        $cosequin = Supplement::updateOrCreate(
            ['name' => 'Cosequin'],
            ['default_unit' => 'chew'],
        );

        $fortiFlora = Supplement::updateOrCreate(
            ['name' => 'FortiFlora'],
            ['default_unit' => 'sachet'],
        );

        $carprofen = Supplement::updateOrCreate(
            ['name' => 'Carprofen (Rimadyl) 75 mg'],
            ['default_unit' => 'tablet'],
        );

        $maple = Dog::where('slug', 'maple')->firstOrFail();

        DogSupplement::updateOrCreate(
            ['dog_id' => $maple->id, 'supplement_id' => $fishOil->id],
            ['dose' => '1.00', 'unit' => 'pump', 'times' => ['07:00']],
        );

        DogSupplement::updateOrCreate(
            ['dog_id' => $maple->id, 'supplement_id' => $cosequin->id],
            ['dose' => '1.00', 'unit' => 'chew', 'times' => ['18:00']],
        );

        DogSupplement::updateOrCreate(
            ['dog_id' => $maple->id, 'supplement_id' => $fortiFlora->id],
            ['dose' => '1.00', 'unit' => 'sachet', 'times' => ['07:30']],
        );

        DogSupplement::updateOrCreate(
            ['dog_id' => $maple->id, 'supplement_id' => $carprofen->id],
            ['dose' => '1.00', 'unit' => 'tablet', 'times' => null],
        );
    }
}
