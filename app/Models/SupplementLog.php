<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\AppLocalDatetime;
use Database\Factories\SupplementLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['dog_id', 'dog_supplement_id', 'amount_given', 'unit', 'given_at', 'was_skipped', 'skip_reason', 'notes'])]
class SupplementLog extends Model
{
    /** @use HasFactory<SupplementLogFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Dog, $this>
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * @return BelongsTo<DogSupplement, $this>
     */
    public function dogSupplement(): BelongsTo
    {
        return $this->belongsTo(DogSupplement::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount_given' => 'decimal:2',
            'given_at'     => AppLocalDatetime::class,
            'was_skipped'  => 'boolean',
        ];
    }
}
