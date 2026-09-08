<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDogRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name'                  => ['sometimes', 'required', 'string', 'max:255'],
            'breed'                 => ['sometimes', 'nullable', 'string', 'max:255'],
            'date_of_birth'         => ['sometimes', 'nullable', 'date'],
            'age_years'             => ['sometimes', 'nullable', 'integer', 'between:0,30'],
            'sex'                   => ['sometimes', 'nullable', 'in:male,female'],
            'is_neutered_or_spayed' => ['sometimes', 'boolean'],
            'weight'                => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'weight_unit'           => ['sometimes', 'nullable', 'in:lb,kg'],
            'color_markings'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'microchip_number'      => ['sometimes', 'nullable', 'string', 'max:255'],
            'rabies_vaccine_date'   => ['sometimes', 'nullable', 'date'],
            'da2pp_vaccine_date'    => ['sometimes', 'nullable', 'date'],
            'other_vaccines'        => ['sometimes', 'nullable', 'string'],
            'allergies'             => ['sometimes', 'nullable', 'string'],
            'medical_conditions'    => ['sometimes', 'nullable', 'string'],
            'current_medications'   => ['sometimes', 'nullable', 'string'],
            'primary_vet_name'      => ['sometimes', 'nullable', 'string', 'max:255'],
            'primary_vet_phone'     => ['sometimes', 'nullable', 'string', 'max:255'],
            'primary_vet_address'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_vet_name'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_vet_phone'   => ['sometimes', 'nullable', 'string', 'max:255'],
            'emergency_vet_address' => ['sometimes', 'nullable', 'string', 'max:255'],
            'owner_name'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'owner_phone'           => ['sometimes', 'nullable', 'string', 'max:255'],
            'notes'                 => ['sometimes', 'nullable', 'string'],
            'feed_times'            => ['sometimes', 'nullable', 'array', 'max:10'],
            'feed_times.*'          => ['date_format:H:i', 'distinct'],
            'feeding_instructions'  => ['sometimes', 'nullable', 'string'],
        ];
    }
}
