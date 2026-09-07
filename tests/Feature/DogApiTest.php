<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DogApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_index_returns_all_active_dogs(): void
    {
        Dog::factory()->count(2)->create();

        $response = $this->getJson('/api/dogs');

        $response->assertOk()->assertJsonCount(2, 'data');
    }

    /**
     * @return void
     */
    public function test_a_dog_can_be_created_with_a_full_profile(): void
    {
        $payload = [
            'name'                  => 'Maple Bear',
            'breed'                 => 'Golden Retriever',
            'date_of_birth'         => '2020-05-01',
            'sex'                   => 'female',
            'is_neutered_or_spayed' => true,
            'weight'                => '62.50',
            'weight_unit'           => 'lb',
            'primary_vet_name'      => 'Dr. Ana Reyes',
            'primary_vet_phone'     => '555-0100',
            'primary_vet_address'   => '1 Vet Way',
            'emergency_vet_name'    => 'Emergency Animal Hospital',
            'emergency_vet_phone'   => '555-0199',
            'emergency_vet_address' => '2 Urgent Ave',
            'owner_name'            => 'Justin',
            'owner_phone'           => '555-0111',
            'feed_times'            => ['07:00', '18:00'],
        ];

        $response = $this->postJson('/api/dogs', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Maple Bear')
            ->assertJsonPath('data.slug', 'maple-bear')
            ->assertJsonPath('data.weight', '62.50')
            ->assertJsonPath('data.primary_vet_name', 'Dr. Ana Reyes')
            ->assertJsonPath('data.emergency_vet_phone', '555-0199')
            ->assertJsonPath('data.feed_times', ['07:00', '18:00']);
    }

    /**
     * @return void
     */
    public function test_a_dog_can_be_shown_by_slug(): void
    {
        $dog = Dog::factory()->create(['name' => 'Biscuit']);

        $response = $this->getJson("/api/dogs/{$dog->slug}");

        $response->assertOk()->assertJsonPath('data.slug', 'biscuit');
    }

    /**
     * @return void
     */
    public function test_show_returns_a_404_for_an_unknown_slug(): void
    {
        $response = $this->getJson('/api/dogs/does-not-exist');

        $response->assertNotFound();
    }

    /**
     * @return void
     */
    public function test_updating_a_dog_edits_vet_contacts_and_feed_times(): void
    {
        $dog = Dog::factory()->create(['feed_times' => ['07:00']]);

        $response = $this->putJson("/api/dogs/{$dog->slug}", [
            'primary_vet_name'    => 'Dr. New Vet',
            'emergency_vet_phone' => '555-0155',
            'feed_times'          => ['07:30', '12:00', '18:30'],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.primary_vet_name', 'Dr. New Vet')
            ->assertJsonPath('data.emergency_vet_phone', '555-0155')
            ->assertJsonPath('data.feed_times', ['07:30', '12:00', '18:30']);
    }

    /**
     * @return void
     */
    public function test_archiving_a_dog_hides_it_from_the_index(): void
    {
        $dog = Dog::factory()->create();

        $this->postJson("/api/dogs/{$dog->slug}/archive")->assertOk();
        $this->getJson('/api/dogs')->assertJsonMissing(['slug' => $dog->slug]);
        $this->getJson('/api/dogs?archived=1')->assertJsonFragment(['slug' => $dog->slug]);
    }

    /**
     * @return void
     */
    public function test_unarchiving_restores_a_dog(): void
    {
        $dog = Dog::factory()->archived()->create();

        $this->postJson("/api/dogs/{$dog->slug}/unarchive")
            ->assertOk()
            ->assertJsonPath('data.archived_at', null);

        $this->getJson('/api/dogs')->assertJsonFragment(['slug' => $dog->slug]);
    }

    /**
     * @return void
     */
    public function test_there_is_no_dog_delete_route(): void
    {
        $dog = Dog::factory()->create();

        $this->deleteJson("/api/dogs/{$dog->slug}")->assertStatus(405);
    }

    /**
     * @return void
     */
    public function test_weight_must_be_greater_than_zero_when_present(): void
    {
        $response = $this->postJson('/api/dogs', [
            'name'   => 'Rosie',
            'weight' => 0,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('weight');
    }
}
