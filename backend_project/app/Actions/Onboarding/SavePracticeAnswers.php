<?php

namespace App\Actions\Onboarding;

use App\Models\Profile;

class SavePracticeAnswers
{
    public function __construct(private AdvanceOnboardingStep $advanceOnboardingStep) {}

    /**
     * @param  array<string, array<int, string>>  $answers
     */
    public function execute(Profile $profile, array $answers): Profile
    {
        $profile->practice_answers = $answers;
        $profile->save();
        $this->advanceOnboardingStep->execute($profile, 'artist_identity');

        return $profile->refresh()->load('disciplines');
    }
}
