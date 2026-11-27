<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\FeedingLogResource;
use App\Http\Resources\SupplementLogResource;
use App\Models\Dog;
use App\Models\FeedingLog;
use App\Models\SupplementLog;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Serves a dog's merged feeding and supplement log history.
 */
final class HistoryController extends Controller
{
    /**
     * @param Request $request
     * @param Dog     $dog
     *
     * @return JsonResponse
     */
    public function index(Request $request, Dog $dog): JsonResponse
    {
        $days  = max(1, (int) $request->query('days', 7));
        $since = now()->subDays($days - 1)->startOfDay();

        $feedingEntries = $dog->feedingLogs()
            ->with('food')
            ->where('fed_at', '>=', $since)
            ->get()
            ->map(fn (FeedingLog $log): array => array_merge(
                ['type' => 'feeding'],
                (new FeedingLogResource($log))->toArray($request),
            ));

        $supplementEntries = $dog->supplementLogs()
            ->with('dogSupplement.supplement')
            ->where('given_at', '>=', $since)
            ->get()
            ->map(fn (SupplementLog $log): array => array_merge(
                ['type' => 'supplement'],
                (new SupplementLogResource($log))->toArray($request),
            ));

        $grouped = $feedingEntries->concat($supplementEntries)
            ->sortByDesc(fn (array $entry): string => $entry['fed_at'] ?? $entry['given_at'])
            ->groupBy(fn (array $entry): string => Carbon::parse($entry['fed_at'] ?? $entry['given_at'])->toDateString())
            ->sortKeysDesc()
            ->map(fn (Collection $entries, string $date): array => [
                'date'    => $date,
                'entries' => $entries->values()->all(),
            ])
            ->values();

        return response()->json(['data' => $grouped]);
    }
}
