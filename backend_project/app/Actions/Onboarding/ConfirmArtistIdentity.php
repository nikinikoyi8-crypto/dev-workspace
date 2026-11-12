<?php

namespace App\Actions\Onboarding;

use App\Models\Profile;

class ConfirmArtistIdentity
{
    public function __construct(private AdvanceOnboardingStep $advanceOnboardingStep) {}

    public function execute(Profile $profile): Profile
    {
        $this->advanceOnboardingStep->execute($profile, 'profile_setup');

        return $profile->refresh()->load('disciplines');
    }
}
