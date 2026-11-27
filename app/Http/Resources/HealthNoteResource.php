<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\HealthNote */
class HealthNoteResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var \Illuminate\Support\Carbon $occurredAt */
        $occurredAt = $this->occurred_at;

        return [
            'id'          => $this->id,
            'dog_id'      => $this->dog_id,
            'occurred_at' => $occurredAt->toIso8601String(),
            'title'       => $this->title,
            'body'        => $this->body,
        ];
    }
}
