<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DogSupplement */
class DogSupplementResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'dog_id'          => $this->dog_id,
            'supplement_id'   => $this->supplement_id,
            'supplement_name' => $this->supplement?->name,
            'dose'            => $this->dose,
            'unit'            => $this->unit,
            'default_unit'    => $this->supplement?->default_unit,
            'times'           => $this->times,
            'notes'           => $this->notes,
        ];
    }
}
