<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\SupplementLog */
class SupplementLogResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var \Illuminate\Support\Carbon $givenAt */
        $givenAt = $this->given_at;

        return [
            'id'                => $this->id,
            'dog_id'            => $this->dog_id,
            'dog_supplement_id' => $this->dog_supplement_id,
            'supplement_name'   => $this->dogSupplement?->supplement?->name,
            'amount_given'      => $this->amount_given,
            'unit'              => $this->unit,
            'given_at'          => $givenAt->toIso8601String(),
            'was_skipped'       => $this->was_skipped,
            'skip_reason'       => $this->skip_reason,
            'notes'             => $this->notes,
        ];
    }
}
