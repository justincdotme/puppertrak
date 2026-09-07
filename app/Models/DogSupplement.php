<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\DogSupplementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['dog_id', 'supplement_id', 'dose', 'unit', 'times', 'notes'])]
class DogSupplement extends Model
{
    /** @use HasFactory<DogSupplementFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Dog, $this>
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Soft-deleted supplements still resolve here so existing assignments
     * keep showing the supplement's name.
     *
     * @return BelongsTo<Supplement, $this>
     */
    public function supplement(): BelongsTo
    {
        return $this->belongsTo(Supplement::class)->withTrashed();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'dose'  => 'decimal:2',
            'times' => 'array',
        ];
    }
}
