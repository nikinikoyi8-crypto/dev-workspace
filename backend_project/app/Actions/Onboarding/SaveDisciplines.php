<?php

namespace App\Actions\Onboarding;

use App\Models\Discipline;
use App\Models\Profile;
use Illuminate\Support\Facades\DB;

class SaveDisciplines
{
    public function __construct(private AdvanceOnboardingStep $advanceOnboardingStep) {}

    /**
     * @param  array{disciplines: array<int, string>, custom_disciplines?: array<int, string>}  $data
     */
    public function execute(Profile $profile, array $data): Profile
    {
        return DB::transaction(function () use ($profile, $data): Profile {
            $disciplineIds = Discipline::query()
                ->whereIn('slug', $data['disciplines'])
                ->pluck('id');

            $profile->disciplines()->sync($disciplineIds);
            $profile->custom_disciplines = $data['custom_disciplines'] ?? $profile->custom_disciplines ?? [];
            $profile->save();

            $this->advanceOnboardingStep->execute($profile, 'define_practice');

            return $profile->refresh()->load('disciplines');
        });
    }
}
