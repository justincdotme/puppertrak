<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHealthNoteRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'noted_at' => ['sometimes', 'nullable', 'date'],
            'title'    => ['sometimes', 'nullable', 'string', 'max:255'],
            'body'     => ['sometimes', 'required', 'string'],
        ];
    }
}
