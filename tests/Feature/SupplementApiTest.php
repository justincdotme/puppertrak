<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplementApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_index_lists_supplements(): void
    {
        Supplement::factory()->count(2)->create();

        $response = $this->getJson('/api/supplements');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    /**
     * @return void
     */
    public function test_store_creates_a_supplement(): void
    {
        $response = $this->postJson('/api/supplements', [
            'name'         => 'Fish oil',
            'default_unit' => 'pump',
        ]);

        $response->assertCreated()->assertJsonPath('data.name', 'Fish oil');
        $this->assertDatabaseHas('supplements', ['name' => 'Fish oil']);
    }

    /**
     * @return void
     */
    public function test_update_edits_a_supplement(): void
    {
        $supplement = Supplement::factory()->create(['name' => 'Old name']);

        $response = $this->putJson("/api/supplements/{$supplement->id}", [
            'name'         => 'New name',
            'default_unit' => $supplement->default_unit,
        ]);

        $response->assertOk()->assertJsonPath('data.name', 'New name');
    }

    /**
     * @return void
     */
    public function test_deleting_a_supplement_still_assigned_to_a_dog_is_rejected(): void
    {
        $dog        = Dog::factory()->create(['name' => 'Maple']);
        $assignment = DogSupplement::factory()->for($dog)->create();

        $response = $this->deleteJson("/api/supplements/{$assignment->supplement_id}");

        $response->assertUnprocessable()->assertJsonFragment(['message' => 'Cannot delete: still assigned to Maple.']);
        $this->assertNull(Supplement::find($assignment->supplement_id)->deleted_at);
    }

    /**
     * @return void
     */
    public function test_deleting_an_unassigned_supplement_soft_deletes_it(): void
    {
        $supplement = Supplement::factory()->create();

        $this->deleteJson("/api/supplements/{$supplement->id}")->assertNoContent();
        $this->assertSoftDeleted('supplements', ['id' => $supplement->id]);
        $this->getJson('/api/supplements')->assertJsonMissing(['id' => $supplement->id]);
    }
}
