<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\FeedingPlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['dog_id', 'food_id', 'amount', 'unit', 'notes'])]
class FeedingPlan extends Model
{
    /** @use HasFactory<FeedingPlanFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Dog, $this>
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * Soft-deleted foods still resolve here so history and existing plans
     * keep showing the food's name.
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
            'amount' => 'decimal:2',
        ];
    }
}
