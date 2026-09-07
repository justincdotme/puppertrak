<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\DogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable([
    'name',
    'breed',
    'date_of_birth',
    'age_years',
    'sex',
    'is_neutered_or_spayed',
    'weight',
    'weight_unit',
    'color_markings',
    'microchip_number',
    'rabies_vaccine_date',
    'da2pp_vaccine_date',
    'other_vaccines',
    'allergies',
    'medical_conditions',
    'current_medications',
    'primary_vet_name',
    'primary_vet_phone',
    'primary_vet_address',
    'emergency_vet_name',
    'emergency_vet_phone',
    'emergency_vet_address',
    'owner_name',
    'owner_phone',
    'notes',
    'feed_times',
    'archived_at',
])]
class Dog extends Model
{
    /** @use HasFactory<DogFactory> */
    use HasFactory;

    /**
     * @return void
     */
    protected static function booted(): void
    {
        static::creating(function (Dog $dog): void {
            $dog->slug = $dog->slug ?: static::uniqueSlugFor($dog->name);
        });
    }

    /**
     * Appends -2, -3... until the slug is free.
     *
     * @param string $name
     *
     * @return string
     */
    protected static function uniqueSlugFor(string $name): string
    {
        $base = Str::slug($name) ?: 'dog';
        $slug = $base;

        for ($i = 2; static::where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    /**
     * @return HasMany<FeedingPlan, $this>
     */
    public function feedingPlans(): HasMany
    {
        return $this->hasMany(FeedingPlan::class);
    }

    /**
     * @return HasMany<FeedingLog, $this>
     */
    public function feedingLogs(): HasMany
    {
        return $this->hasMany(FeedingLog::class);
    }

    /**
     * @return HasMany<DogSupplement, $this>
     */
    public function dogSupplements(): HasMany
    {
        return $this->hasMany(DogSupplement::class);
    }

    /**
     * @return HasMany<SupplementLog, $this>
     */
    public function supplementLogs(): HasMany
    {
        return $this->hasMany(SupplementLog::class);
    }

    /**
     * @return HasMany<HealthNote, $this>
     */
    public function healthNotes(): HasMany
    {
        return $this->hasMany(HealthNote::class);
    }

    /**
     * Route models by slug so URLs read `/dogs/maple` instead of `/dogs/1`.
     *
     * @return string
     */
    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /**
     * @param Builder<Dog> $query
     *
     * @return Builder<Dog>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date_of_birth'         => 'date',
            'is_neutered_or_spayed' => 'boolean',
            'weight'                => 'decimal:2',
            'rabies_vaccine_date'   => 'date',
            'da2pp_vaccine_date'    => 'date',
            'feed_times'            => 'array',
            'archived_at'           => 'datetime',
        ];
    }
}
