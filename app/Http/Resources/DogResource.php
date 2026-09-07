<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Dog */
class DogResource extends JsonResource
{
    /**
     * @param Request $request
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                    => $this->id,
            'name'                  => $this->name,
            'slug'                  => $this->slug,
            'breed'                 => $this->breed,
            'date_of_birth'         => $this->date_of_birth?->format('Y-m-d'),
            'age_years'             => $this->age_years,
            'age'                   => $this->date_of_birth ? $this->date_of_birth->age : $this->age_years,
            'sex'                   => $this->sex,
            'is_neutered_or_spayed' => $this->is_neutered_or_spayed,
            'weight'                => $this->weight,
            'weight_unit'           => $this->weight_unit,
            'color_markings'        => $this->color_markings,
            'microchip_number'      => $this->microchip_number,
            'rabies_vaccine_date'   => $this->rabies_vaccine_date?->format('Y-m-d'),
            'da2pp_vaccine_date'    => $this->da2pp_vaccine_date?->format('Y-m-d'),
            'other_vaccines'        => $this->other_vaccines,
            'allergies'             => $this->allergies,
            'medical_conditions'    => $this->medical_conditions,
            'current_medications'   => $this->current_medications,
            'primary_vet_name'      => $this->primary_vet_name,
            'primary_vet_phone'     => $this->primary_vet_phone,
            'primary_vet_address'   => $this->primary_vet_address,
            'emergency_vet_name'    => $this->emergency_vet_name,
            'emergency_vet_phone'   => $this->emergency_vet_phone,
            'emergency_vet_address' => $this->emergency_vet_address,
            'owner_name'            => $this->owner_name,
            'owner_phone'           => $this->owner_phone,
            'notes'                 => $this->notes,
            'feed_times'            => $this->feed_times,
            'archived_at'           => $this->archived_at?->toIso8601String(),
            'feeding_plans'         => FeedingPlanResource::collection($this->whenLoaded('feedingPlans')),
            'dog_supplements'       => DogSupplementResource::collection($this->whenLoaded('dogSupplements')),
        ];
    }
}
