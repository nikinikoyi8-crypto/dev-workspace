<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Password::defaults(function () {
            $password = Password::min(10)
                ->letters()
                ->numbers();

            if (app()->isProduction()) {
                $password->uncompromised();
            }

            return $password;
        });

        RateLimiter::for('login', function (Request $request) {
            $email = Str::lower((string) $request->input('email', ''));

            return [
                Limit::perMinute(5)->by($request->ip().':'.$email),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });
    }
}
