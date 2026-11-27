<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DogTodayResource;
use App\Models\Dog;
use App\Services\TodayService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Serves the daily today view for all active dogs or one dog.
 */
final class DashboardController extends Controller
{
    /**
     * @param TodayService $todayService
     * @param Dog|null     $dog          Bound when the single-dog route is hit.
     *
     * @return DogTodayResource|AnonymousResourceCollection
     */
    public function today(TodayService $todayService, ?Dog $dog = null): DogTodayResource|AnonymousResourceCollection
    {
        if ($dog !== null) {
            $dog->load(['feedingPlans.food', 'dogSupplements.supplement']);

            return new DogTodayResource($todayService->forDog($dog));
        }

        return DogTodayResource::collection($todayService->forAllDogs());
    }
}
