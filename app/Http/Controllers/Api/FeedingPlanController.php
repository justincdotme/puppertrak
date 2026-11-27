<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeedingPlanRequest;
use App\Http\Requests\UpdateFeedingPlanRequest;
use App\Http\Resources\FeedingPlanResource;
use App\Models\Dog;
use App\Models\FeedingPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages a dog's feeding plans.
 */
final class FeedingPlanController extends Controller
{
    /**
     * @param Dog $dog
     *
     * @return AnonymousResourceCollection
     */
    public function index(Dog $dog): AnonymousResourceCollection
    {
        return FeedingPlanResource::collection($dog->feedingPlans()->with('food')->get());
    }

    /**
     * @param StoreFeedingPlanRequest $request
     * @param Dog                     $dog
     *
     * @return JsonResponse
     */
    public function store(StoreFeedingPlanRequest $request, Dog $dog): JsonResponse
    {
        $plan = $dog->feedingPlans()->create($request->validated());

        return (new FeedingPlanResource($plan->load('food')))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * @param UpdateFeedingPlanRequest $request
     * @param FeedingPlan              $feedingPlan
     *
     * @return FeedingPlanResource
     */
    public function update(UpdateFeedingPlanRequest $request, FeedingPlan $feedingPlan): FeedingPlanResource
    {
        $feedingPlan->update($request->validated());

        return new FeedingPlanResource($feedingPlan->load('food'));
    }

    /**
     * @param FeedingPlan $feedingPlan
     *
     * @return JsonResponse
     */
    public function destroy(FeedingPlan $feedingPlan): JsonResponse
    {
        $feedingPlan->delete();

        return response()->json(null, 204);
    }
}
