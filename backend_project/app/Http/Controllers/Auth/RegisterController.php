<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\RegisterUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterUserRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function __construct(protected RegisterUser $registerUser)
    {
    }

    public function store(RegisterUserRequest $request): JsonResponse
    {
        $user = $this->registerUser->execute($request->validated(), $request);

        return response()->json([
            'data' => new UserResource($user->fresh(['profile'])),
        ], 201);
    }
}
