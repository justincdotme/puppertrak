<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\FoodFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'bag_description', 'notes'])]
class Food extends Model
{
    /** @use HasFactory<FoodFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * Laravel's pluralizer treats "food" as uncountable and would otherwise
     * guess the table name "food".
     *
     * @var string
     */
    protected $table = 'foods';

    /**
     * @return HasMany<FeedingPlan, $this>
     */
    public function feedingPlans(): HasMany
    {
        return $this->hasMany(FeedingPlan::class);
    }
}
