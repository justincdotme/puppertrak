<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FeedingPlan */
class FeedingPlanResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'        => $this->id,
            'dog_id'    => $this->dog_id,
            'food_id'   => $this->food_id,
            'food_name' => $this->food?->name,
            'amount'    => $this->amount,
            'unit'      => $this->unit,
            'notes'     => $this->notes,
        ];
    }
}
