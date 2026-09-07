<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreFeedingLogRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'food_id'     => ['nullable', 'exists:foods,id'],
            'amount'      => ['required', 'numeric', 'min:0'],
            'unit'        => ['required', 'string', 'max:50'],
            'fed_at'      => ['nullable', 'date'],
            'was_skipped' => ['boolean'],
            'skip_reason' => ['nullable', 'string', 'max:255', 'required_if:was_skipped,true'],
            'notes'       => ['nullable', 'string'],
        ];
    }

    /**
     * @param Validator $validator
     *
     * @return void
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            // A zero-amount log means "didn't eat"; require the reason even
            // when the caller forgot to flip the was_skipped switch.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ((float) $this->input('amount') === 0.0 && ! $this->filled('skip_reason')) {
                $validator->errors()->add('skip_reason', 'The skip reason field is required when amount is 0.');
            }
        });
    }
}
