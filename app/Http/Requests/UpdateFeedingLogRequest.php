<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\FeedingLog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateFeedingLogRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'food_id'     => ['sometimes', 'nullable', 'exists:foods,id'],
            'amount'      => ['sometimes', 'required', 'numeric', 'min:0'],
            'unit'        => ['sometimes', 'required', 'string', 'max:50'],
            'fed_at'      => ['sometimes', 'nullable', 'date'],
            'feed_time'   => ['sometimes', 'nullable', 'string', 'date_format:H:i'],
            'was_skipped' => ['sometimes', 'boolean'],
            'skip_reason' => ['nullable', 'string', 'max:255', 'required_if:was_skipped,true'],
            'notes'       => ['sometimes', 'nullable', 'string'],
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
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            // A zero-amount log means "didn't eat"; require the reason even
            // when the caller forgot to flip the was_skipped switch.
            if ($this->has('amount') && (float) $this->input('amount') === 0.0 && ! $this->filled('skip_reason')) {
                $validator->errors()->add('skip_reason', 'The skip reason field is required when amount is 0.');
            }

            if (! $this->has('feed_time')) {
                return;
            }

            $feedTime = $this->input('feed_time');

            if ($feedTime === null) {
                return;
            }

            /** @var FeedingLog $feedingLog */
            $feedingLog = $this->route('feeding_log');
            $feedTimes  = $feedingLog->dog->feed_times ?? [];

            if (! in_array($feedTime, $feedTimes, true)) {
                $validator->errors()->add('feed_time', 'The selected feed time is not one of this dog\'s scheduled feed times.');
            }
        });
    }
}
