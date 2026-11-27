<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\HealthNote;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthNoteApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    /**
     * @return void
     */
    public function test_index_lists_a_dogs_notes_newest_first(): void
    {
        $dog = Dog::factory()->create();
        HealthNote::factory()->for($dog)->create(['occurred_at' => Carbon::parse('2026-09-01 08:00')]);
        HealthNote::factory()->for($dog)->create(['occurred_at' => Carbon::parse('2026-09-05 08:00')]);

        $response = $this->getJson("/api/dogs/{$dog->slug}/health-notes");

        $response->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.occurred_at', Carbon::parse('2026-09-05 08:00')->toIso8601String());
    }

    /**
     * @return void
     */
    public function test_body_is_required(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/health-notes", []);

        $response->assertUnprocessable()->assertJsonValidationErrors('body');
    }

    /**
     * @return void
     */
    public function test_store_defaults_occurred_at_to_now(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 09:00:00'));
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/health-notes", [
            'body' => 'Vomited after dinner',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('health_notes', ['dog_id' => $dog->id, 'occurred_at' => '2026-09-07 09:00:00']);
    }

    /**
     * @return void
     */
    public function test_store_keeps_a_backdated_event_time_distinct_from_the_creation_time(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 09:00:00'));
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/health-notes", [
            'body'        => 'Vomited after dinner',
            'occurred_at' => '2026-09-05 19:30:00',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.occurred_at', Carbon::parse('2026-09-05 19:30:00')->toIso8601String());

        $this->assertDatabaseHas('health_notes', [
            'id'          => $response->json('data.id'),
            'occurred_at' => '2026-09-05 19:30:00',
            'created_at'  => '2026-09-07 09:00:00',
        ]);
    }

    /**
     * @return void
     */
    public function test_update_leaves_the_event_time_alone_when_it_is_not_submitted(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-09-07 09:00:00'));
        $note = HealthNote::factory()->create(['occurred_at' => Carbon::parse('2026-09-05 19:30:00')]);

        $response = $this->putJson("/api/health-notes/{$note->id}", ['body' => 'Corrected wording']);

        $response->assertOk()
            ->assertJsonPath('data.occurred_at', Carbon::parse('2026-09-05 19:30:00')->toIso8601String());
    }

    /**
     * @return void
     */
    public function test_update_edits_a_note(): void
    {
        $note = HealthNote::factory()->create(['body' => 'Old']);

        $response = $this->putJson("/api/health-notes/{$note->id}", ['body' => 'New']);

        $response->assertOk()->assertJsonPath('data.body', 'New');
    }

    /**
     * @return void
     */
    public function test_destroy_removes_a_note(): void
    {
        $note = HealthNote::factory()->create();

        $this->deleteJson("/api/health-notes/{$note->id}")->assertNoContent();
        $this->assertDatabaseMissing('health_notes', ['id' => $note->id]);
    }
}
