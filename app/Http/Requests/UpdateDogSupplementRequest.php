<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDogSupplementRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'supplement_id' => ['sometimes', 'required', 'exists:supplements,id'],
            'dose'          => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit'          => ['sometimes', 'nullable', 'string', 'max:50'],
            'times'         => ['sometimes', 'nullable', 'array', 'max:10'],
            'times.*'       => ['date_format:H:i'],
            'notes'         => ['sometimes', 'nullable', 'string'],
        ];
    }
}
