<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHealthNoteRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'occurred_at' => ['nullable', 'date'],
            'title'       => ['nullable', 'string', 'max:255'],
            'body'        => ['required', 'string'],
        ];
    }
}
