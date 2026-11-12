<?php

namespace App\Actions\Onboarding;

use App\Models\Profile;

class AdvanceOnboardingStep
{
    private const STEPS = [
        'discover_art',
        'define_practice',
        'artist_identity',
        'profile_setup',
        'completed',
    ];

    public function execute(Profile $profile, string $nextStep): void
    {
        $currentIndex = array_search($profile->onboarding_step, self::STEPS, true);
        $nextIndex = array_search($nextStep, self::STEPS, true);

        if ($currentIndex !== false && $nextIndex !== false && $nextIndex > $currentIndex) {
            $profile->onboarding_step = $nextStep;
            $profile->save();
        }
    }

    public static function hasReached(string $currentStep, string $targetStep): bool
    {
        $currentIndex = array_search($currentStep, self::STEPS, true);
        $targetIndex = array_search($targetStep, self::STEPS, true);

        return $currentIndex !== false && $targetIndex !== false && $currentIndex >= $targetIndex;
    }
}
