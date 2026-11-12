<?php

namespace App\Http\Controllers;

use App\Actions\Onboarding\ConfirmArtistIdentity;
use App\Actions\Onboarding\GetOnboardingStatus;
use App\Actions\Onboarding\SaveDisciplines;
use App\Actions\Onboarding\SaveOnboardingProfile;
use App\Actions\Onboarding\SavePracticeAnswers;
use App\Http\Requests\Onboarding\UpdateDisciplinesRequest;
use App\Http\Requests\Onboarding\UpdatePracticeRequest;
use App\Http\Requests\Onboarding\UpdateProfileRequest;
use App\Http\Resources\OnboardingResource;
use App\Models\Profile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingController extends Controller
{
    public function show(Request $request, GetOnboardingStatus $getOnboardingStatus): JsonResponse
    {
        $profile = $getOnboardingStatus->execute($this->profileFor($request));

        return response()->json(['data' => new OnboardingResource($profile)]);
    }

    public function updateDisciplines(
        UpdateDisciplinesRequest $request,
        SaveDisciplines $saveDisciplines,
    ): JsonResponse {
        $profile = $saveDisciplines->execute($this->profileFor($request), $request->validated());

        return response()->json(['data' => new OnboardingResource($profile)]);
    }

    public function updatePractice(
        UpdatePracticeRequest $request,
        SavePracticeAnswers $savePracticeAnswers,
    ): JsonResponse {
        $profile = $savePracticeAnswers->execute(
            $this->profileFor($request),
            $request->validated()['practice_answers'],
        );

        return response()->json(['data' => new OnboardingResource($profile)]);
    }

    public function confirmIdentity(Request $request, ConfirmArtistIdentity $confirmArtistIdentity): JsonResponse
    {
        $profile = $confirmArtistIdentity->execute($this->profileFor($request));

        return response()->json(['data' => new OnboardingResource($profile)]);
    }

    public function updateProfile(
        UpdateProfileRequest $request,
        SaveOnboardingProfile $saveOnboardingProfile,
    ): JsonResponse {
        $profile = $saveOnboardingProfile->execute($this->profileFor($request), $request->validated());

        return response()->json(['data' => new OnboardingResource($profile)]);
    }

    private function profileFor(Request $request): Profile
    {
        return $request->user()->profile;
    }
}
