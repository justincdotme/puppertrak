<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDogRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:255'],
            'breed'                 => ['nullable', 'string', 'max:255'],
            'date_of_birth'         => ['nullable', 'date'],
            'age_years'             => ['nullable', 'integer', 'between:0,30'],
            'sex'                   => ['nullable', 'in:male,female'],
            'is_neutered_or_spayed' => ['boolean'],
            'weight'                => ['nullable', 'numeric', 'gt:0'],
            'weight_unit'           => ['nullable', 'in:lb,kg'],
            'color_markings'        => ['nullable', 'string', 'max:255'],
            'microchip_number'      => ['nullable', 'string', 'max:255'],
            'rabies_vaccine_date'   => ['nullable', 'date'],
            'da2pp_vaccine_date'    => ['nullable', 'date'],
            'other_vaccines'        => ['nullable', 'string'],
            'allergies'             => ['nullable', 'string'],
            'medical_conditions'    => ['nullable', 'string'],
            'current_medications'   => ['nullable', 'string'],
            'primary_vet_name'      => ['nullable', 'string', 'max:255'],
            'primary_vet_phone'     => ['nullable', 'string', 'max:255'],
            'primary_vet_address'   => ['nullable', 'string', 'max:255'],
            'emergency_vet_name'    => ['nullable', 'string', 'max:255'],
            'emergency_vet_phone'   => ['nullable', 'string', 'max:255'],
            'emergency_vet_address' => ['nullable', 'string', 'max:255'],
            'owner_name'            => ['nullable', 'string', 'max:255'],
            'owner_phone'           => ['nullable', 'string', 'max:255'],
            'notes'                 => ['nullable', 'string'],
            'feed_times'            => ['nullable', 'array', 'max:10'],
            'feed_times.*'          => ['date_format:H:i', 'distinct'],
            'feeding_instructions'  => ['nullable', 'string'],
        ];
    }
}
