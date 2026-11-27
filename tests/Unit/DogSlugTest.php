<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Dog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DogSlugTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return void
     */
    public function test_slug_is_generated_from_name(): void
    {
        $dog = Dog::factory()->create(['name' => 'Maple Bear']);

        $this->assertSame('maple-bear', $dog->slug);
    }

    /**
     * @return void
     */
    public function test_slug_collisions_get_numeric_suffixes(): void
    {
        Dog::factory()->create(['name' => 'Maple']);
        $second = Dog::factory()->create(['name' => 'Maple']);

        $this->assertSame('maple-2', $second->slug);
    }

    /**
     * @return void
     */
    public function test_slug_survives_rename(): void
    {
        $dog = Dog::factory()->create(['name' => 'Maple']);
        $dog->update(['name' => 'Maple II']);

        $this->assertSame('maple', $dog->fresh()->slug);
    }
}
