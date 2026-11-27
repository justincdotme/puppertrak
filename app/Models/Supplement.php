<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SupplementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'default_unit', 'notes'])]
class Supplement extends Model
{
    /** @use HasFactory<SupplementFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * @return HasMany<DogSupplement, $this>
     */
    public function dogSupplements(): HasMany
    {
        return $this->hasMany(DogSupplement::class);
    }
}
