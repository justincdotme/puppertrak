<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplementRequest;
use App\Http\Requests\UpdateSupplementRequest;
use App\Http\Resources\SupplementResource;
use App\Models\Supplement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages the supplement catalog.
 */
final class SupplementController extends Controller
{
    /**
     * @return AnonymousResourceCollection
     */
    public function index(): AnonymousResourceCollection
    {
        return SupplementResource::collection(Supplement::orderBy('name')->get());
    }

    /**
     * @param StoreSupplementRequest $request
     *
     * @return JsonResponse
     */
    public function store(StoreSupplementRequest $request): JsonResponse
    {
        $supplement = Supplement::create($request->validated());

        return (new SupplementResource($supplement))->response()->setStatusCode(201);
    }

    /**
     * @param Supplement $supplement
     *
     * @return SupplementResource
     */
    public function show(Supplement $supplement): SupplementResource
    {
        return new SupplementResource($supplement);
    }

    /**
     * @param UpdateSupplementRequest $request
     * @param Supplement              $supplement
     *
     * @return SupplementResource
     */
    public function update(UpdateSupplementRequest $request, Supplement $supplement): SupplementResource
    {
        $supplement->update($request->validated());

        return new SupplementResource($supplement);
    }

    /**
     * Blocks deletion while a dog is still assigned this supplement; an
     * unassigned delete only soft-deletes so log history keeps the name.
     *
     * @param Supplement $supplement
     *
     * @return JsonResponse
     */
    public function destroy(Supplement $supplement): JsonResponse
    {
        if ($supplement->dogSupplements()->exists()) {
            $dogNames = $supplement->dogSupplements()
                ->with('dog')
                ->get()
                ->pluck('dog.name')
                ->unique()
                ->implode(', ');

            return response()->json([
                'message' => "Cannot delete: still assigned to {$dogNames}.",
            ], 422);
        }

        $supplement->delete();

        return response()->json(null, 204);
    }
}
