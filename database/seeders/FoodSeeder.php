<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Dog;
use App\Models\FeedingPlan;
use App\Models\Food;
use Illuminate\Database\Seeder;

class FoodSeeder extends Seeder
{
    /**
     * @return void
     */
    public function run(): void
    {
        $proPlan = Food::updateOrCreate(
            ['name' => 'Purina Pro Plan Sensitive Skin'],
            ['bag_description' => 'Salmon & rice formula, 30 lb bag'],
        );

        $core = Food::updateOrCreate(
            ['name' => 'Wellness CORE Small Breed'],
            ['bag_description' => 'Grain-free chicken formula, 4 lb bag'],
        );

        $ziwi = Food::updateOrCreate(
            ['name' => 'Ziwi Peak Air-Dried'],
            ['bag_description' => 'Lamb topper, 2.2 lb bag'],
        );

        $maple   = Dog::where('slug', 'maple')->firstOrFail();
        $biscuit = Dog::where('slug', 'biscuit')->firstOrFail();

        FeedingPlan::updateOrCreate(
            ['dog_id' => $maple->id, 'food_id' => $proPlan->id],
            ['amount' => '1.00', 'unit' => 'cup'],
        );

        FeedingPlan::updateOrCreate(
            ['dog_id' => $maple->id, 'food_id' => $ziwi->id],
            ['amount' => '0.33', 'unit' => 'cup', 'notes' => 'Topper mixed into the morning meal'],
        );

        FeedingPlan::updateOrCreate(
            ['dog_id' => $biscuit->id, 'food_id' => $core->id],
            ['amount' => '0.75', 'unit' => 'cup'],
        );
    }
}
