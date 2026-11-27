<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\DogSupplement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateDogSupplementRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $isInterval = $this->effectiveFrequency() === 'interval';

        // A row switching to interval needs both fields; one already on
        // interval keeps its stored values when they are omitted.
        $intervalPresence = $isInterval && $this->assignment()->frequency !== 'interval'
            ? ['required']
            : ['sometimes', 'required'];

        return [
            'supplement_id' => ['sometimes', 'required', 'exists:supplements,id'],
            'dose'          => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit'          => ['sometimes', 'nullable', 'string', 'max:50'],
            'times'         => ['sometimes', 'nullable', 'array', 'max:10'],
            'times.*'       => ['date_format:H:i'],
            'frequency'     => ['sometimes', Rule::in(['as_needed', 'daily', 'interval'])],
            'interval_days' => $isInterval
                ? [...$intervalPresence, 'integer', 'min:2', 'max:365']
                : ['sometimes', 'nullable', 'prohibited'],
            'start_date' => $isInterval
                ? [...$intervalPresence, 'date']
                : ['sometimes', 'nullable', 'prohibited'],
            'notes' => ['sometimes', 'nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'interval_days.prohibited' => 'The interval days field is only allowed when frequency is interval.',
            'start_date.prohibited'    => 'The start date field is only allowed when frequency is interval.',
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
            $times = $this->input('times');

            if ($this->effectiveFrequency() === 'as_needed' && is_array($times) && count($times) > 0) {
                $validator->errors()->add('times', 'Times cannot be set for as-needed supplements.');
            }
        });
    }

    /**
     * Partial updates are judged against the stored frequency when the
     * request does not change it.
     *
     * @return mixed
     */
    private function effectiveFrequency(): mixed
    {
        return $this->input('frequency', $this->assignment()->frequency);
    }

    /**
     * @return DogSupplement
     */
    private function assignment(): DogSupplement
    {
        /** @var DogSupplement $assignment */
        $assignment = $this->route('dog_supplement');

        return $assignment;
    }
}
