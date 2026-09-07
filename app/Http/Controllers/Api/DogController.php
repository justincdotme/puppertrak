<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDogRequest;
use App\Http\Requests\UpdateDogRequest;
use App\Http\Resources\DogResource;
use App\Models\Dog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages dog profiles, including archiving and unarchiving.
 */
final class DogController extends Controller
{
    /**
     * @param Request $request
     *
     * @return AnonymousResourceCollection
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->boolean('archived')
            ? Dog::query()->whereNotNull('archived_at')
            : Dog::active();

        return DogResource::collection(
            $query->with(['feedingPlans.food', 'dogSupplements.supplement'])->get(),
        );
    }

    /**
     * @param StoreDogRequest $request
     *
     * @return JsonResponse
     */
    public function store(StoreDogRequest $request): JsonResponse
    {
        $dog = Dog::create($request->validated());

        return (new DogResource($dog))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @param Dog $dog
     *
     * @return DogResource
     */
    public function show(Dog $dog): DogResource
    {
        $dog->load(['feedingPlans.food', 'dogSupplements.supplement']);

        return new DogResource($dog);
    }

    /**
     * @param UpdateDogRequest $request
     * @param Dog              $dog
     *
     * @return DogResource
     */
    public function update(UpdateDogRequest $request, Dog $dog): DogResource
    {
        $dog->update($request->validated());

        return new DogResource($dog);
    }

    /**
     * @param Dog $dog
     *
     * @return DogResource
     */
    public function archive(Dog $dog): DogResource
    {
        $dog->update(['archived_at' => now()]);

        return new DogResource($dog);
    }

    /**
     * @param Dog $dog
     *
     * @return DogResource
     */
    public function unarchive(Dog $dog): DogResource
    {
        $dog->update(['archived_at' => null]);

        return new DogResource($dog);
    }
}
