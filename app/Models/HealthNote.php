<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\AppLocalDatetime;
use Database\Factories\HealthNoteFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['dog_id', 'noted_at', 'title', 'body'])]
class HealthNote extends Model
{
    /** @use HasFactory<HealthNoteFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Dog, $this>
     */
    public function dog(): BelongsTo
    {
        return $this->belongsTo(Dog::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'noted_at' => AppLocalDatetime::class,
        ];
    }
}
