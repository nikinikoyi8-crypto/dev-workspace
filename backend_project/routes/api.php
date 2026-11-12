<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\Auth\MeController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->prefix('v1')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::post('/register', [RegisterController::class, 'store'])->middleware('throttle:register');
        Route::post('/login', [LoginController::class, 'store'])->middleware('throttle:login');

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('/logout', [LogoutController::class, 'destroy']);
            Route::get('/me', [MeController::class, 'show']);
        });
    });

    Route::prefix('onboarding')->middleware('auth:sanctum')->group(function () {
        Route::get('/', [OnboardingController::class, 'show']);
        Route::put('/disciplines', [OnboardingController::class, 'updateDisciplines'])
            ->middleware('onboarding.step:discover_art');
        Route::put('/practice', [OnboardingController::class, 'updatePractice'])
            ->middleware('onboarding.step:define_practice');
        Route::post('/identity', [OnboardingController::class, 'confirmIdentity'])
            ->middleware('onboarding.step:artist_identity');
        Route::put('/profile', [OnboardingController::class, 'updateProfile'])
            ->middleware('onboarding.step:profile_setup');
    });
});
