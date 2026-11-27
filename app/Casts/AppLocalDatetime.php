<?php

declare(strict_types=1);

namespace App\Casts;

use Carbon\CarbonInterface;
use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Normalizes incoming timestamps to the app timezone before storage.
 * Strings with an explicit timezone designator (Z or offset) are
 * converted; bare strings are already app-local and pass through
 * unchanged because Carbon parses them in the app timezone.
 *
 * @implements CastsAttributes<Carbon, Carbon|string|null>
 */
class AppLocalDatetime implements CastsAttributes
{
    /**
     * @param Model                $model
     * @param string               $key
     * @param mixed                $value
     * @param array<string, mixed> $attributes
     *
     * @return Carbon|null
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?Carbon
    {
        if ($value === null) {
            return null;
        }

        return Carbon::parse($value);
    }

    /**
     * @param Model                $model
     * @param string               $key
     * @param mixed                $value
     * @param array<string, mixed> $attributes
     *
     * @return string|null
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): ?string
    {
        if ($value === null) {
            return null;
        }

        $carbon = $value instanceof CarbonInterface
            ? $value
            : Carbon::parse($value);

        return $carbon->setTimezone(config('app.timezone'))->format('Y-m-d H:i:s');
    }
}
