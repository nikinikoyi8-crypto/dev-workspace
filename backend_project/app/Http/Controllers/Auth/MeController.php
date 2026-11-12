<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\MeUser;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;

class MeController extends Controller
{
    public function __construct(protected MeUser $meUser)
    {
    }

    public function show(): JsonResponse
    {
        $user = $this->meUser->execute();

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }
}
