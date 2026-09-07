<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplementLogRequest;
use App\Http\Requests\UpdateSupplementLogRequest;
use App\Http\Resources\SupplementLogResource;
use App\Models\Dog;
use App\Models\SupplementLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages supplement logs.
 */
final class SupplementLogController extends Controller
{
    /**
     * @param Request $request
     *
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $logs = SupplementLog::query()
            ->when($request->filled('dog'), fn (Builder $query) => $query->whereHas(
                'dog',
                fn (Builder $dogQuery) => $dogQuery->where('slug', $request->query('dog')),
            ))
            ->when($request->filled('from'), fn (Builder $query) => $query->where('given_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn (Builder $query) => $query->where('given_at', '<=', $request->date('to')?->endOfDay()))
            ->with('dogSupplement.supplement')
            ->orderByDesc('given_at')
            ->get();

        return SupplementLogResource::collection($logs);
    }

    /**
     * @param StoreSupplementLogRequest $request
     * @param Dog                       $dog
     *
     * @return JsonResponse
     */
    public function store(StoreSupplementLogRequest $request, Dog $dog): JsonResponse
    {
        $data = $request->validated();
        $data['given_at'] ??= now();

        $log = $dog->supplementLogs()->create($data);

        return (new SupplementLogResource($log->load('dogSupplement.supplement')))->response()->setStatusCode(201);
    }

    /**
     * @param UpdateSupplementLogRequest $request
     * @param SupplementLog              $supplementLog
     *
     * @return SupplementLogResource
     */
    public function update(UpdateSupplementLogRequest $request, SupplementLog $supplementLog): SupplementLogResource
    {
        $supplementLog->update($request->validated());

        return new SupplementLogResource($supplementLog->load('dogSupplement.supplement'));
    }

    /**
     * @param SupplementLog $supplementLog
     *
     * @return JsonResponse
     */
    public function destroy(SupplementLog $supplementLog): JsonResponse
    {
        $supplementLog->delete();

        return response()->json(null, 204);
    }
}
