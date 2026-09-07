<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\AppLocalDatetime;
use Database\Factories\FeedingLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['dog_id', 'food_id', 'amount', 'unit', 'fed_at', 'was_skipped', 'skip_reason', 'notes'])]
class FeedingLog extends Model
{
    /** @use HasFactory<FeedingLogFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Dog, $this>
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Soft-deleted foods still resolve here so log history keeps showing the
     * food's name.
     *
     * @return BelongsTo<Food, $this>
     */
    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class)->withTrashed();
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount'      => 'decimal:2',
            'fed_at'      => AppLocalDatetime::class,
            'was_skipped' => 'boolean',
        ];
    }
}
