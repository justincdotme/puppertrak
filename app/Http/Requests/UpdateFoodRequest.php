<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFoodRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name'            => ['sometimes', 'required', 'string', 'max:255'],
            'bag_description' => ['sometimes', 'nullable', 'string'],
            'notes'           => ['sometimes', 'nullable', 'string'],
        ];
    }
}
