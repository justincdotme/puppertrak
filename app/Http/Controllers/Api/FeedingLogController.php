<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeedingLogRequest;
use App\Http\Requests\UpdateFeedingLogRequest;
use App\Http\Resources\FeedingLogResource;
use App\Models\Dog;
use App\Models\FeedingLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages feeding logs.
 */
final class FeedingLogController extends Controller
{
    /**
     * @param Request $request
     *
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = FeedingLog::query()->with('food')->orderByDesc('fed_at');

        if ($request->filled('dog')) {
            $slug = $request->string('dog')->toString();
            $query->whereHas('dog', fn (Builder $dogs) => $dogs->where('slug', $slug));
        }

        if ($request->filled('from')) {
            $query->whereDate('fed_at', '>=', $request->string('from')->toString());
        }

        if ($request->filled('to')) {
            $query->whereDate('fed_at', '<=', $request->string('to')->toString());
        }

        return FeedingLogResource::collection($query->get());
    }

    /**
     * @param StoreFeedingLogRequest $request
     * @param Dog                    $dog
     *
     * @return JsonResponse
     */
    public function store(StoreFeedingLogRequest $request, Dog $dog): JsonResponse
    {
        $data = $request->validated();
        $data['fed_at'] ??= now();
        $data['was_skipped'] ??= false;

        $log = $dog->feedingLogs()->create($data);

        return (new FeedingLogResource($log->load('food')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @param UpdateFeedingLogRequest $request
     * @param FeedingLog              $feedingLog
     *
     * @return FeedingLogResource
     */
    public function update(UpdateFeedingLogRequest $request, FeedingLog $feedingLog): FeedingLogResource
    {
        $feedingLog->update($request->validated());

        return new FeedingLogResource($feedingLog->load('food'));
    }

    /**
     * @param FeedingLog $feedingLog
     *
     * @return JsonResponse
     */
    public function destroy(FeedingLog $feedingLog): JsonResponse
    {
        $feedingLog->delete();

        return response()->json(null, 204);
    }
}
