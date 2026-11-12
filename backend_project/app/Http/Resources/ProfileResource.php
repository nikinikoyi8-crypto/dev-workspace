<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'display_name' => $this->display_name,
            'bio' => $this->bio,
            'country' => $this->country,
            'avatar_url' => $this->avatar_url,
            'cover_url' => $this->cover_url,
            'socials' => $this->socials ?? [],
            'verification_requested' => (bool) $this->verification_requested,
            'onboarding_step' => $this->onboarding_step,
            'onboarding_completed' => $this->onboarding_step === 'completed',
        ];
    }
}
