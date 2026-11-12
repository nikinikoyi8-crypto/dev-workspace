<?php

namespace App\Support;

class OnboardingCatalog
{
    /**
     * @return array{disciplines: array<int, array<string, mixed>>, practice_questions: array<int, array<string, mixed>>}
     */
    public static function read(): array
    {
        return json_decode(
            file_get_contents(database_path('data/onboarding-catalog.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
    }
}
