<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboarded
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->profile?->onboarding_step !== 'completed') {
            return response()->json([
                'message' => 'Complete onboarding to access this resource.',
                'code' => 'onboarding_required',
            ], 403);
        }

        return $next($request);
    }
}
