<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFoodRequest;
use App\Http\Requests\UpdateFoodRequest;
use App\Http\Resources\FoodResource;
use App\Models\Food;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages the food catalog.
 */
final class FoodController extends Controller
{
    /**
     * @return AnonymousResourceCollection
     */
    public function index(): AnonymousResourceCollection
    {
        return FoodResource::collection(Food::orderBy('name')->get());
    }

    /**
     * @param StoreFoodRequest $request
     *
     * @return JsonResponse
     */
    public function store(StoreFoodRequest $request): JsonResponse
    {
        $food = Food::create($request->validated());

        return (new FoodResource($food))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @param Food $food
     *
     * @return FoodResource
     */
    public function show(Food $food): FoodResource
    {
        return new FoodResource($food);
    }

    /**
     * @param UpdateFoodRequest $request
     * @param Food              $food
     *
     * @return FoodResource
     */
    public function update(UpdateFoodRequest $request, Food $food): FoodResource
    {
        $food->update($request->validated());

        return new FoodResource($food);
    }

    /**
     * @param Food $food
     *
     * @return JsonResponse
     */
    public function destroy(Food $food): JsonResponse
    {
        if ($food->feedingPlans()->exists()) {
            $dogNames = $food->feedingPlans()
                ->with('dog')
                ->get()
                ->pluck('dog.name')
                ->unique()
                ->implode(', ');

            return response()->json([
                'message' => "This food is still assigned to {$dogNames}. Remove it from their feeding plans first.",
            ], 422);
        }

        $food->delete();

        return response()->json(null, 204);
    }
}
