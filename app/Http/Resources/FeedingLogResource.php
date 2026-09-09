<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\FeedingLog */
class FeedingLogResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'dog_id'      => $this->dog_id,
            'food_id'     => $this->food_id,
            'food_name'   => $this->food?->name,
            'amount'      => $this->amount,
            'unit'        => $this->unit,
            'fed_at'      => $this->fed_at->toIso8601String(),
            'feed_time'   => $this->feed_time,
            'was_skipped' => $this->was_skipped,
            'skip_reason' => $this->skip_reason,
            'notes'       => $this->notes,
        ];
    }
}
