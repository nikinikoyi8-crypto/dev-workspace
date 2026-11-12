<?php

namespace Tests\Feature\Auth;

use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Cookie;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_profile_is_created(): void
    {
        $payload = [
            'full_name' => 'John Doe',
            'username' => 'john_doe',
            'email' => 'JOHN@EXAMPLE.COM',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'role' => 'artist',
        ];

        $response = $this->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.full_name', 'John Doe')
            ->assertJsonPath('data.username', 'john_doe')
            ->assertJsonPath('data.email', 'john@example.com')
            ->assertJsonPath('data.role', 'artist')
            ->assertJsonPath('data.profile.display_name', null)
            ->assertJsonPath('data.profile.verification_requested', false);

        $this->assertDatabaseHas('users', [
            'email' => 'john@example.com',
            'username' => 'john_doe',
            'role' => 'artist',
        ]);

        $user = User::query()->where('email', 'john@example.com')->first();
        $this->assertNotNull($user);
        $this->assertDatabaseHas('profiles', ['user_id' => $user->id, 'verification_requested' => false]);
        $this->assertTrue(Hash::check('Password123', $user->password));
    }

    public function test_register_validation_errors_are_returned(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => '',
            'username' => 'ab',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'different',
            'role' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['full_name', 'username', 'email', 'password', 'role']);
    }

    public function test_registration_rejects_email_longer_than_255_characters(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'Long Email User',
            'username' => 'long_email_user',
            'email' => str_repeat('a', 245).'@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_duplicate_email_and_username_are_rejected_case_insensitively(): void
    {
        User::factory()->create([
            'full_name' => 'Existing User',
            'username' => 'existing_user',
            'email' => 'existing@example.com',
        ]);

        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'New User',
            'username' => 'EXISTING_USER',
            'email' => 'Existing@Example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'role' => 'visitor',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username', 'email']);
    }

    public function test_admin_role_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'Admin User',
            'username' => 'admin_user',
            'email' => 'admin@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'role' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['role']);
    }

    public function test_verification_requested_is_ignored_if_sent(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'full_name' => 'Jane Doe',
            'username' => 'jane_doe',
            'email' => 'jane@example.com',
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
            'role' => 'visitor',
            'verification_requested' => true,
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('profiles', [
            'user_id' => User::query()->where('email', 'jane@example.com')->value('id'),
            'verification_requested' => false,
        ]);
    }

    public function test_user_can_login_successfully(): void
    {
        $user = User::factory()->create([
            'full_name' => 'Login User',
            'username' => 'login_user',
            'email' => 'login@example.com',
            'password' => Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'LOGIN@EXAMPLE.COM',
            'password' => 'Password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', 'login@example.com');
    }

    public function test_login_does_not_create_a_remember_me_cookie(): void
    {
        $user = User::factory()->create([
            'full_name' => 'Remember User',
            'username' => 'remember_user',
            'email' => 'remember@example.com',
            'password' => Hash::make('Password123'),
            'remember_token' => null,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'remember@example.com',
            'password' => 'Password123',
        ]);

        $rememberCookies = array_filter(
            $response->headers->getCookies(),
            fn (Cookie $cookie): bool => str_starts_with($cookie->getName(), 'remember_web_'),
        );

        $response->assertStatus(200);
        $this->assertCount(0, $rememberCookies);
        $this->assertNull($user->fresh()->remember_token);
    }

    public function test_login_with_wrong_password_returns_generic_error(): void
    {
        User::factory()->create([
            'full_name' => 'Wrong Password User',
            'username' => 'wrong_password',
            'email' => 'wrong@example.com',
            'password' => Hash::make('Password123'),
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'These credentials do not match our records.');
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create([
            'full_name' => 'Rate Limit User',
            'username' => 'rate_limit_user',
            'email' => 'ratelimit@example.com',
            'password' => Hash::make('Password123'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'ratelimit@example.com',
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'ratelimit@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(429);
    }

    public function test_user_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'web')->postJson('/api/v1/auth/logout');

        $response->assertStatus(204);
        $this->assertGuest('web');
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::factory()->create();
        $profile = new Profile;
        $profile->user_id = $user->id;
        $profile->save();

        $response = $this->actingAs($user, 'web')->getJson('/api/v1/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.profile.verification_requested', false);
    }

    public function test_me_requires_authentication(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401);
    }
}
