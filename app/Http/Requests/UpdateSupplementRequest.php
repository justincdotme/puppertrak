<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSupplementRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name'         => ['sometimes', 'required', 'string', 'max:255'],
            'default_unit' => ['sometimes', 'nullable', 'string', 'max:50'],
            'notes'        => ['sometimes', 'nullable', 'string'],
        ];
    }
}
