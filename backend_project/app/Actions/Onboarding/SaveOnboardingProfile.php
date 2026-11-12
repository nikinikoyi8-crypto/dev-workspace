<?php

namespace App\Actions\Onboarding;

use App\Models\Profile;

class SaveOnboardingProfile
{
    public function __construct(private AdvanceOnboardingStep $advanceOnboardingStep) {}

    /**
     * @param  array{bio?: ?string, country: string, socials?: array<int, array{label: string, url: string}>}  $data
     */
    public function execute(Profile $profile, array $data): Profile
    {
        $profile->fill([
            'bio' => array_key_exists('bio', $data) ? $data['bio'] : $profile->bio,
            'country' => $data['country'],
            'socials' => $data['socials'] ?? $profile->socials ?? [],
        ]);
        $profile->save();

        if ($profile->onboarding_step !== 'completed') {
            $profile->onboarding_completed_at = now();
            $profile->save();
        }

        $this->advanceOnboardingStep->execute($profile, 'completed');

        return $profile->refresh()->load('disciplines');
    }
}
