<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Dog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DogAgeTest extends TestCase
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
     * @return array<string, array{0: string, 1: int}>
     */
    public static function elapsedTimeProvider(): array
    {
        return [
            'same day'                => ['2026-06-28', 7],
            'one day short of a year' => ['2027-06-27', 7],
            'exactly a year later'    => ['2027-06-28', 8],
            'several years later'     => ['2030-01-15', 10],
        ];
    }

    /**
     * @param string  $today
     * @param integer $expectedAge
     *
     * @return void
     */
    #[DataProvider('elapsedTimeProvider')]
    public function test_an_age_entered_without_a_birth_date_grows_with_time(string $today, int $expectedAge): void
    {
        Carbon::setTestNow('2026-06-28 09:00');
        $slug = $this->postJson('/api/dogs', $this->payload(['age_years' => 7]))->json('data.slug');

        Carbon::setTestNow($today . ' 09:00');

        $this->getJson("/api/dogs/{$slug}")->assertOk()->assertJsonPath('data.age', $expectedAge);
    }

    /**
     * @return void
     */
    public function test_a_birth_date_overrides_the_recorded_age(): void
    {
        Carbon::setTestNow('2026-06-28 09:00');
        $slug = $this->postJson('/api/dogs', $this->payload([
            'age_years'     => 2,
            'date_of_birth' => '2019-06-30',
        ]))->json('data.slug');

        $this->getJson("/api/dogs/{$slug}")->assertJsonPath('data.age', 6);
    }

    /**
     * The edit form sends back the current age, so re-saving it must keep the
     * original anchor or the dog would lose up to a year on every save.
     *
     * @return void
     */
    public function test_resaving_the_current_age_keeps_the_original_anchor(): void
    {
        Carbon::setTestNow('2026-06-28 09:00');
        $slug = $this->postJson('/api/dogs', $this->payload(['age_years' => 7]))->json('data.slug');

        Carbon::setTestNow('2027-07-01 09:00');
        $this->putJson("/api/dogs/{$slug}", ['age_years' => 8, 'notes' => 'Annual checkup'])
            ->assertOk()
            ->assertJsonPath('data.age', 8);

        Carbon::setTestNow('2028-06-29 09:00');
        $this->getJson("/api/dogs/{$slug}")->assertJsonPath('data.age', 9);
    }

    /**
     * @return void
     */
    public function test_changing_the_age_restarts_the_count_from_today(): void
    {
        Carbon::setTestNow('2026-06-28 09:00');
        $slug = $this->postJson('/api/dogs', $this->payload(['age_years' => 7]))->json('data.slug');

        Carbon::setTestNow('2027-07-01 09:00');
        $this->putJson("/api/dogs/{$slug}", ['age_years' => 10])->assertJsonPath('data.age', 10);

        Carbon::setTestNow('2028-06-30 09:00');
        $this->getJson("/api/dogs/{$slug}")->assertJsonPath('data.age', 10);

        Carbon::setTestNow('2028-07-01 09:00');
        $this->getJson("/api/dogs/{$slug}")->assertJsonPath('data.age', 11);
    }

    /**
     * @return void
     */
    public function test_clearing_the_age_clears_the_recorded_date(): void
    {
        Carbon::setTestNow('2026-06-28 09:00');
        $slug = $this->postJson('/api/dogs', $this->payload(['age_years' => 7]))->json('data.slug');

        $this->putJson("/api/dogs/{$slug}", ['age_years' => null])
            ->assertOk()
            ->assertJsonPath('data.age', null);

        $this->assertNull(Dog::where('slug', $slug)->value('age_years_recorded_on'));
    }

    /**
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    private function payload(array $overrides): array
    {
        return array_merge([
            'name'                  => 'Rosie',
            'sex'                   => 'female',
            'is_neutered_or_spayed' => true,
            'weight_unit'           => 'lb',
        ], $overrides);
    }
}
