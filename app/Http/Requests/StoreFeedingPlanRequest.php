<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeedingPlanRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'food_id' => ['required', 'exists:foods,id'],
            'amount'  => ['required', 'numeric', 'min:0'],
            'unit'    => ['required', 'string', 'max:50'],
            'notes'   => ['nullable', 'string'],
        ];
    }
}
