<?php

namespace App\Actions\Auth;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginUser
{
    /**
     * Attempt to authenticate a user with a session-based guard.
     */
    public function execute(string $email, string $password, Request $request): ?object
    {
        $credentials = [
            'email' => strtolower(trim($email)),
            'password' => $password,
        ];

        if (! Auth::guard('web')->attempt($credentials, false)) {
            return null;
        }

        $request->session()->regenerate();

        return Auth::guard('web')->user()->load('profile');
    }
}
