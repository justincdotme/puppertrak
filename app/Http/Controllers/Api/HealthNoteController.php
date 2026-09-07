<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHealthNoteRequest;
use App\Http\Requests\UpdateHealthNoteRequest;
use App\Http\Resources\HealthNoteResource;
use App\Models\Dog;
use App\Models\HealthNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Manages a dog's health notes.
 */
final class HealthNoteController extends Controller
{
    /**
     * @param Dog $dog
     *
     * @return AnonymousResourceCollection
     */
    public function index(Dog $dog): AnonymousResourceCollection
    {
        return HealthNoteResource::collection(
            $dog->healthNotes()->orderByDesc('noted_at')->get(),
        );
    }

    /**
     * @param StoreHealthNoteRequest $request
     * @param Dog                    $dog
     *
     * @return JsonResponse
     */
    public function store(StoreHealthNoteRequest $request, Dog $dog): JsonResponse
    {
        $data = $request->validated();
        $data['noted_at'] ??= now();

        $note = $dog->healthNotes()->create($data);

        return (new HealthNoteResource($note))->response()->setStatusCode(201);
    }

    /**
     * @param UpdateHealthNoteRequest $request
     * @param HealthNote              $healthNote
     *
     * @return HealthNoteResource
     */
    public function update(UpdateHealthNoteRequest $request, HealthNote $healthNote): HealthNoteResource
    {
        $healthNote->update($request->validated());

        return new HealthNoteResource($healthNote);
    }

    /**
     * @param HealthNote $healthNote
     *
     * @return JsonResponse
     */
    public function destroy(HealthNote $healthNote): JsonResponse
    {
        $healthNote->delete();

        return response()->json(null, 204);
    }
}
