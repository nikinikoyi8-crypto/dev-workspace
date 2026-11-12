<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LoginUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginUserRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class LoginController extends Controller
{
    public function __construct(protected LoginUser $loginUser)
    {
    }

    public function store(LoginUserRequest $request): JsonResponse
    {
        $user = $this->loginUser->execute($request->email, $request->password, $request);

        if (! $user) {
            return response()->json([
                'message' => 'These credentials do not match our records.',
            ], 422);
        }

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }
}
