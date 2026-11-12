<?php

namespace App\Actions\Onboarding;

use App\Models\Profile;

class GetOnboardingStatus
{
    public function execute(Profile $profile): Profile
    {
        return $profile->load('disciplines');
    }
}
