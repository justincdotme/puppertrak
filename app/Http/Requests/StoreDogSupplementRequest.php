<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'frequency'     => ['sometimes', Rule::in(['as_needed', 'daily', 'interval'])],
            'interval_days' => [
                'nullable',
                'integer',
                'min:2',
                'max:365',
                'required_if:frequency,interval',
                'prohibited_unless:frequency,interval',
            ],
            'start_date' => [
                'nullable',
                'date',
                'required_if:frequency,interval',
                'prohibited_unless:frequency,interval',
            ],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'interval_days.prohibited_unless' => 'The interval days field is only allowed when frequency is interval.',
            'start_date.prohibited_unless'    => 'The start date field is only allowed when frequency is interval.',
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
            $frequency = $this->input('frequency');
            $times     = $this->input('times');

            if ($frequency === 'as_needed' && is_array($times) && count($times) > 0) {
                $validator->errors()->add('times', 'Times cannot be set for as-needed supplements.');
            }
        });
    }

    /**
     * @return void
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('frequency')) {
            $times    = $this->input('times');
            $hasTimes = is_array($times) && count($times) > 0;

            $this->merge(['frequency' => $hasTimes ? 'daily' : 'as_needed']);
        }
    }
}
