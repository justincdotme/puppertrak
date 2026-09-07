<?php

declare(strict_types=1);

namespace Tests\Utils;

use App\Services\TodayService;
use Carbon\Carbon;
use Carbon\CarbonInterval;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Exposes the protected matchToWindows method for unit testing.
 */
class TodayServiceTestable extends TodayService
{
    /**
     * @template TLog of Model
     *
     * @param array<int, string>    $times    Scheduled HH:MM strings.
     * @param Collection<int, TLog> $logs     Today's logs, ordered by timestamp.
     * @param string                $column   Timestamp attribute on the log model.
     * @param CarbonInterval        $variance Window half-width.
     *
     * @return array{0: array<int, array{at: Carbon, log: TLog|null}>, 1: list<TLog>}
     */
    public function exposeMatchToWindows(array $times, Collection $logs, string $column, CarbonInterval $variance): array
    {
        return $this->matchToWindows($times, $logs, $column, $variance);
    }
}
