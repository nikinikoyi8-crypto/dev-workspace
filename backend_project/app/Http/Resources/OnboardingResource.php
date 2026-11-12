<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OnboardingResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'step' => $this->onboarding_step,
            'completed' => $this->onboarding_step === 'completed',
            'disciplines' => $this->whenLoaded(
                'disciplines',
                fn (): array => $this->disciplines->pluck('slug')->values()->all(),
            ),
            'custom_disciplines' => $this->custom_disciplines ?? [],
            'practice_answers' => $this->practice_answers ?? (object) [],
            'display_name' => $this->display_name,
            'bio' => $this->bio,
            'country' => $this->country,
            'socials' => $this->socials ?? [],
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_url,
        ];
    }
}
