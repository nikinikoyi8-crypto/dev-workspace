<?php

namespace App\Http\Middleware;

use App\Actions\Onboarding\AdvanceOnboardingStep;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingStepReached
{
    public function handle(Request $request, Closure $next, string $step): Response
    {
        $profile = $request->user()?->profile;

        if (! $profile || ! AdvanceOnboardingStep::hasReached($profile->onboarding_step, $step)) {
            return response()->json([
                'message' => 'This onboarding step has not been reached.',
                'code' => 'onboarding_step_not_reached',
            ], 409);
        }

        return $next($request);
    }
}
