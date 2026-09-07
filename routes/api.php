<?php

declare(strict_types=1);

use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DogController;
use App\Http\Controllers\Api\DogSupplementController;
use App\Http\Controllers\Api\FeedingLogController;
use App\Http\Controllers\Api\FeedingPlanController;
use App\Http\Controllers\Api\FoodController;
use App\Http\Controllers\Api\HealthNoteController;
use App\Http\Controllers\Api\HistoryController;
use App\Http\Controllers\Api\SupplementController;
use App\Http\Controllers\Api\SupplementLogController;
use Illuminate\Support\Facades\Route;

Route::get('dashboard/today', [DashboardController::class, 'today']);
Route::get('dogs/{dog:slug}/today', [DashboardController::class, 'today']);

Route::apiResource('dogs', DogController::class)->except(['destroy']);
Route::post('dogs/{dog:slug}/archive', [DogController::class, 'archive']);
Route::post('dogs/{dog:slug}/unarchive', [DogController::class, 'unarchive']);

Route::apiResource('foods', FoodController::class);

Route::get('dogs/{dog:slug}/feeding-plans', [FeedingPlanController::class, 'index']);
Route::post('dogs/{dog:slug}/feeding-plans', [FeedingPlanController::class, 'store']);
Route::put('feeding-plans/{feeding_plan}', [FeedingPlanController::class, 'update']);
Route::delete('feeding-plans/{feeding_plan}', [FeedingPlanController::class, 'destroy']);

Route::get('feeding-logs', [FeedingLogController::class, 'index']);
Route::post('dogs/{dog:slug}/feeding-logs', [FeedingLogController::class, 'store']);
Route::put('feeding-logs/{feeding_log}', [FeedingLogController::class, 'update']);
Route::delete('feeding-logs/{feeding_log}', [FeedingLogController::class, 'destroy']);

Route::apiResource('supplements', SupplementController::class);

Route::get('dogs/{dog:slug}/supplements', [DogSupplementController::class, 'index']);
Route::post('dogs/{dog:slug}/supplements', [DogSupplementController::class, 'store']);
Route::put('dog-supplements/{dog_supplement}', [DogSupplementController::class, 'update']);
Route::delete('dog-supplements/{dog_supplement}', [DogSupplementController::class, 'destroy']);

Route::get('supplement-logs', [SupplementLogController::class, 'index']);
Route::post('dogs/{dog:slug}/supplement-logs', [SupplementLogController::class, 'store']);
Route::put('supplement-logs/{supplement_log}', [SupplementLogController::class, 'update']);
Route::delete('supplement-logs/{supplement_log}', [SupplementLogController::class, 'destroy']);

Route::get('dogs/{dog:slug}/health-notes', [HealthNoteController::class, 'index']);
Route::post('dogs/{dog:slug}/health-notes', [HealthNoteController::class, 'store']);
Route::put('health-notes/{health_note}', [HealthNoteController::class, 'update']);
Route::delete('health-notes/{health_note}', [HealthNoteController::class, 'destroy']);

Route::get('dogs/{dog:slug}/history', [HistoryController::class, 'index']);
