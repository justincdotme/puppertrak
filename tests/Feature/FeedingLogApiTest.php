<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use App\Models\FeedingLog;
use App\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class FeedingLogApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_a_feeding_log_can_be_created_for_a_dog(): void
    {
        $dog  = Dog::factory()->create();
        $food = Food::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'food_id' => $food->id,
            'amount'  => '1.00',
            'unit'    => 'cup',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.dog_id', $dog->id)
            ->assertJsonPath('data.food_name', $food->name)
            ->assertJsonPath('data.was_skipped', false);

        $this->assertEqualsWithDelta(now()->timestamp, FeedingLog::first()->fed_at->timestamp, 5);
    }

    /**
     * @return void
     */
    public function test_skip_reason_is_required_when_amount_is_zero(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'amount' => 0,
            'unit'   => 'cup',
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('skip_reason');
    }

    /**
     * @return void
     */
    public function test_a_skipped_feeding_can_be_logged_with_a_reason(): void
    {
        $dog = Dog::factory()->create();

        $response = $this->postJson("/api/dogs/{$dog->slug}/feeding-logs", [
            'amount'      => 0,
            'unit'        => 'cup',
            'was_skipped' => true,
            'skip_reason' => "wouldn't eat",
        ]);

        $response->assertCreated()->assertJsonPath('data.skip_reason', "wouldn't eat");
    }

    /**
     * @return void
     */
    public function test_a_feeding_log_can_be_updated(): void
    {
        $log = FeedingLog::factory()->create(['amount' => '1.00']);

        $response = $this->putJson("/api/feeding-logs/{$log->id}", ['amount' => '0.50']);

        $response->assertOk()->assertJsonPath('data.amount', '0.50');
    }

    /**
     * @return void
     */
    public function test_a_partial_update_leaves_the_omitted_fields_untouched(): void
    {
        $food = Food::factory()->create();
        $log  = FeedingLog::factory()->for($food)->create([
            'amount' => '1.00',
            'unit'   => 'cup',
            'fed_at' => Carbon::parse('2026-01-05 07:05'),
            'notes'  => 'ate slowly',
        ]);

        $this->patchJson("/api/feeding-logs/{$log->id}", ['amount' => '1.25'])->assertOk();

        $log->refresh();

        $this->assertSame('1.25', $log->amount);
        $this->assertSame($food->id, $log->food_id);
        $this->assertSame('ate slowly', $log->notes);
        $this->assertSame('cup', $log->unit);
        $this->assertSame('2026-01-05 07:05:00', $log->fed_at->format('Y-m-d H:i:s'));
    }

    /**
     * @return void
     */
    public function test_a_feeding_log_can_be_deleted(): void
    {
        $log = FeedingLog::factory()->create();

        $this->deleteJson("/api/feeding-logs/{$log->id}")->assertNoContent();
        $this->assertDatabaseMissing('feeding_logs', ['id' => $log->id]);
    }

    /**
     * @return void
     */
    public function test_index_filters_by_dog_slug_and_date_range(): void
    {
        $maple   = Dog::factory()->create(['name' => 'Maple']);
        $biscuit = Dog::factory()->create(['name' => 'Biscuit']);

        FeedingLog::factory()->for($maple)->create(['fed_at' => Carbon::parse('2026-01-05 07:00')]);
        FeedingLog::factory()->for($maple)->create(['fed_at' => Carbon::parse('2026-01-10 07:00')]);
        FeedingLog::factory()->for($biscuit)->create(['fed_at' => Carbon::parse('2026-01-05 07:00')]);

        $response = $this->getJson("/api/feeding-logs?dog={$maple->slug}&from=2026-01-01&to=2026-01-06");

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.dog_id', $maple->id);
    }
}
