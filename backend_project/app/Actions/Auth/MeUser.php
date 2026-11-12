<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class MeUser
{
    /**
     * Return the authenticated user with their profile.
     */
    public function execute(): User
    {
        return Auth::guard('web')->user()->load('profile');
    }
}
