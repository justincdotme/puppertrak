<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DogSupplementApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_index_lists_a_dogs_assignments(): void
    {
        $dog = Dog::factory()->create();
        DogSupplement::factory()->for($dog)->count(2)->create();

        $response = $this->getJson("/api/dogs/{$dog->slug}/supplements");

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    /**
     * @return void
     */
    public function test_store_creates_an_assignment_and_defaults_unit_from_the_supplement(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create(['default_unit' => 'pump']);

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
            'times'         => ['07:00'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.unit', 'pump')
            ->assertJsonPath('data.supplement_name', $supplement->name);
    }

    /**
     * @return void
     */
    public function test_store_rejects_a_dose_below_zero(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => -1,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('dose');
    }

    /**
     * @return void
     */
    public function test_store_rejects_a_malformed_time(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
            'times'         => ['not-a-time'],
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('times.0');
    }

    /**
     * @return void
     */
    public function test_empty_times_means_as_needed(): void
    {
        $dog        = Dog::factory()->create();
        $supplement = Supplement::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/supplements", [
            'supplement_id' => $supplement->id,
            'dose'          => 1,
            'times'         => [],
        ]);

        $response->assertCreated()->assertJsonPath('data.times', []);
    }

    /**
     * @return void
     */
    public function test_update_edits_an_assignment(): void
    {
        $assignment = DogSupplement::factory()->create(['dose' => 1]);

        $response = $this->putJson("/api/dog-supplements/{$assignment->id}", ['dose' => 2]);

        $response->assertOk()->assertJsonPath('data.dose', '2.00');
    }

    /**
     * @return void
     */
    public function test_destroy_removes_the_assignment(): void
    {
        $assignment = DogSupplement::factory()->create();

        $this->deleteJson("/api/dog-supplements/{$assignment->id}")->assertNoContent();
        $this->assertDatabaseMissing('dog_supplements', ['id' => $assignment->id]);
    }
}
