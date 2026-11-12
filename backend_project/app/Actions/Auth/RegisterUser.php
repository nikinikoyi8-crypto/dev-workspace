<?php

namespace App\Actions\Auth;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RegisterUser
{
    /**
     * Create a new user and associated profile within a transaction.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data, Request $request): User
    {
        try {
            return DB::transaction(function () use ($data, $request) {
                $user = User::create([
                    'full_name' => $data['full_name'],
                    'username' => strtolower((string) $data['username']),
                    'email' => strtolower((string) $data['email']),
                    'password' => $data['password'],
                ]);

                $user->role = $data['role'] ?? 'visitor';
                $user->save();

                $profile = new Profile;
                $profile->user_id = $user->id;
                $profile->socials = [];
                $profile->verification_requested = false;
                $profile->save();

                Auth::guard('web')->login($user);
                $request->session()->regenerate();

                return $user->fresh(['profile']);
            });
        } catch (UniqueConstraintViolationException $exception) {
            $message = strtolower($exception->getMessage());

            if (str_contains($message, 'users_username_lower_unique')) {
                throw ValidationException::withMessages([
                    'username' => 'The username has already been taken.',
                ]);
            }

            if (str_contains($message, 'users_email_unique')) {
                throw ValidationException::withMessages([
                    'email' => 'The email has already been taken.',
                ]);
            }

            if (DB::table('users')
                ->whereRaw('LOWER(username) = ?', [strtolower((string) $data['username'])])
                ->exists()) {
                throw ValidationException::withMessages([
                    'username' => 'The username has already been taken.',
                ]);
            }

            if (DB::table('users')
                ->whereRaw('LOWER(email) = ?', [strtolower((string) $data['email'])])
                ->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'The email has already been taken.',
                ]);
            }

            throw $exception;
        }
    }
}
