<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateSupplementLogRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'dog_supplement_id' => ['sometimes', 'nullable', 'exists:dog_supplements,id'],
            'amount_given'      => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit'              => ['sometimes', 'required', 'string', 'max:50'],
            'given_at'          => ['sometimes', 'nullable', 'date'],
            'was_skipped'       => ['sometimes', 'boolean'],
            'skip_reason'       => ['nullable', 'string', 'max:255', 'required_if:was_skipped,true'],
            'notes'             => ['sometimes', 'nullable', 'string'],
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
            // A zero-amount log means the supplement wasn't given; require the
            // reason even when the caller forgot to flip the was_skipped switch.
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ($this->has('amount_given') && (float) $this->input('amount_given') === 0.0 && ! $this->filled('skip_reason')) {
                $validator->errors()->add('skip_reason', 'The skip reason field is required when amount given is 0.');
            }
        });
    }
}
