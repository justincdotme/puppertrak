<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Wraps the TodayService payload for a single dog.
 *
 * @property array<string, mixed> $resource
 */
class DogTodayResource extends JsonResource
{
    /**
     * The underlying resource is the raw array from TodayService, not a model.
     *
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array<string, mixed> $data */
        $data = $this->resource;

        return $data;
    }
}
