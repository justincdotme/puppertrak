<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDogSupplementRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'supplement_id' => ['required', 'exists:supplements,id'],
            'dose'          => ['required', 'numeric', 'min:0'],
            'unit'          => ['nullable', 'string', 'max:50'],
            'times'         => ['nullable', 'array', 'max:10'],
            'times.*'       => ['date_format:H:i'],
            'notes'         => ['nullable', 'string'],
        ];
    }
}
