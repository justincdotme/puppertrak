<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\FeedingLog;
use App\Models\Food;
use App\Models\HealthNote;
use App\Models\Supplement;
use App\Models\SupplementLog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class LogSeeder extends Seeder
{
    /**
     * Seeds a day of history plus today's partial logs so the dashboard shows
     * a live overdue warning. Guarded on `FeedingLog::exists()` so re-seeding
     * a live database never duplicates the demo history.
     *
     * @return void
     */
    public function run(): void
    {
        if (FeedingLog::exists()) {
            return;
        }

        $maple   = Dog::where('slug', 'maple')->firstOrFail();
        $biscuit = Dog::where('slug', 'biscuit')->firstOrFail();

        $proPlan = Food::where('name', 'Purina Pro Plan Sensitive Skin')->firstOrFail();
        $core    = Food::where('name', 'Wellness CORE Small Breed')->firstOrFail();

        $fishOil    = $this->assignmentFor($maple, 'Fish oil');
        $cosequin   = $this->assignmentFor($maple, 'Cosequin');
        $fortiFlora = $this->assignmentFor($maple, 'FortiFlora');

        $yesterday = Carbon::yesterday();
        $today     = Carbon::today();

        FeedingLog::factory()->for($maple)->create([
            'food_id' => $proPlan->id,
            'amount'  => '1.00',
            'unit'    => 'cup',
            'fed_at'  => $yesterday->copy()->setTime(7, 5),
        ]);

        FeedingLog::factory()->skipped()->for($maple)->create([
            'food_id' => null,
            'unit'    => 'cup',
            'fed_at'  => $yesterday->copy()->setTime(18, 10),
        ]);

        FeedingLog::factory()->for($biscuit)->create([
            'food_id' => $core->id,
            'amount'  => '0.75',
            'unit'    => 'cup',
            'fed_at'  => $yesterday->copy()->setTime(7, 35),
        ]);

        FeedingLog::factory()->for($biscuit)->create([
            'food_id' => $core->id,
            'amount'  => '0.75',
            'unit'    => 'cup',
            'fed_at'  => $yesterday->copy()->setTime(18, 35),
        ]);

        FeedingLog::factory()->for($maple)->create([
            'food_id' => $proPlan->id,
            'amount'  => '1.00',
            'unit'    => 'cup',
            'fed_at'  => $today->copy()->setTime(7, 5),
        ]);

        SupplementLog::factory()->for($maple)->create([
            'dog_supplement_id' => $fishOil->id,
            'amount_given'      => $fishOil->dose,
            'unit'              => $fishOil->unit,
            'given_at'          => $yesterday->copy()->setTime(7, 5),
        ]);

        SupplementLog::factory()->for($maple)->create([
            'dog_supplement_id' => $cosequin->id,
            'amount_given'      => $cosequin->dose,
            'unit'              => $cosequin->unit,
            'given_at'          => $yesterday->copy()->setTime(18, 10),
        ]);

        SupplementLog::factory()->for($maple)->create([
            'dog_supplement_id' => $fortiFlora->id,
            'amount_given'      => $fortiFlora->dose,
            'unit'              => $fortiFlora->unit,
            'given_at'          => $yesterday->copy()->setTime(7, 35),
        ]);

        HealthNote::factory()->for($maple)->create([
            'occurred_at' => now()->subHours(2),
            'title'       => null,
            'body'        => 'Vomited after dinner',
        ]);
    }

    /**
     * @param Dog    $dog            Dog the assignment belongs to.
     * @param string $supplementName Name of the seeded supplement.
     *
     * @return DogSupplement
     */
    private function assignmentFor(Dog $dog, string $supplementName): DogSupplement
    {
        $supplement = Supplement::where('name', $supplementName)->firstOrFail();

        return DogSupplement::where('dog_id', $dog->id)
            ->where('supplement_id', $supplement->id)
            ->firstOrFail();
    }
}
