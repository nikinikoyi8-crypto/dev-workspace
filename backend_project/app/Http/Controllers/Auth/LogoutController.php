<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\LogoutUser;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class LogoutController extends Controller
{
    public function __construct(protected LogoutUser $logoutUser)
    {
    }

    public function destroy(Request $request): Response
    {
        $this->logoutUser->execute($request);

        return response()->noContent();
    }
}
