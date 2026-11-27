<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeedingPlanRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'food_id' => ['sometimes', 'required', 'exists:foods,id'],
            'amount'  => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit'    => ['sometimes', 'required', 'string', 'max:50'],
            'notes'   => ['sometimes', 'nullable', 'string'],
        ];
    }
}
