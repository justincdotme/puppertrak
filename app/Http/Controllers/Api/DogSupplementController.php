<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDogSupplementRequest;
use App\Http\Requests\UpdateDogSupplementRequest;
use App\Http\Resources\DogSupplementResource;
use App\Models\Dog;
use App\Models\DogSupplement;
use App\Models\Supplement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages a dog's supplement assignments.
 */
final class DogSupplementController extends Controller
{
    /**
     * @param Dog $dog
     *
     * @return AnonymousResourceCollection
     */
    public function index(Dog $dog): AnonymousResourceCollection
    {
        return DogSupplementResource::collection(
            $dog->dogSupplements()->with('supplement')->get(),
        );
    }

    /**
     * @param StoreDogSupplementRequest $request
     * @param Dog                       $dog
     *
     * @return JsonResponse
     */
    public function store(StoreDogSupplementRequest $request, Dog $dog): JsonResponse
    {
        $data = $request->validated();
        $data['unit'] ??= Supplement::findOrFail($data['supplement_id'])->default_unit;

        $dogSupplement = $dog->dogSupplements()->create($data);

        return (new DogSupplementResource($dogSupplement->load('supplement')))->response()->setStatusCode(201);
    }

    /**
     * @param UpdateDogSupplementRequest $request
     * @param DogSupplement              $dogSupplement
     *
     * @return DogSupplementResource
     */
    public function update(UpdateDogSupplementRequest $request, DogSupplement $dogSupplement): DogSupplementResource
    {
        $dogSupplement->update($request->validated());

        return new DogSupplementResource($dogSupplement->load('supplement'));
    }

    /**
     * @param DogSupplement $dogSupplement
     *
     * @return JsonResponse
     */
    public function destroy(DogSupplement $dogSupplement): JsonResponse
    {
        $dogSupplement->delete();

        return response()->json(null, 204);
    }
}
