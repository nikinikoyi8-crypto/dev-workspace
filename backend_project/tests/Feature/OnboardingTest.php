<?php

namespace Tests\Feature;

use App\Models\Discipline;
use App\Models\Profile;
use App\Models\User;
use Database\Seeders\DisciplineSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        (new DisciplineSeeder)->run();
    }

    public function test_user_cannot_skip_ahead_to_a_later_onboarding_step(): void
    {
        [$user] = $this->userWithProfile();

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/practice', ['practice_answers' => []])
            ->assertStatus(409)
            ->assertJsonPath('code', 'onboarding_step_not_reached');

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/profile', ['country' => 'Iran'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'onboarding_step_not_reached');
    }

    public function test_six_disciplines_are_rejected(): void
    {
        [$user] = $this->userWithProfile();

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/disciplines', [
                'disciplines' => ['digital', 'painter', 'illustrator', 'sketch', 'concept', 'character'],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['disciplines']);
    }

    public function test_unknown_discipline_slug_is_rejected(): void
    {
        [$user] = $this->userWithProfile();

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/disciplines', ['disciplines' => ['not-in-catalog']])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['disciplines.0']);
    }

    public function test_javascript_social_url_is_rejected(): void
    {
        [$user, $profile] = $this->userWithProfile('profile_setup');

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/profile', [
                'country' => 'Iran',
                'socials' => [['label' => 'Portfolio', 'url' => 'javascript:alert(1)']],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['socials.0.url']);

        $this->assertSame('profile_setup', $profile->fresh()->onboarding_step);
    }

    public function test_html_tags_are_removed_from_bio_when_profile_is_saved(): void
    {
        [$user] = $this->userWithProfile('profile_setup');

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/profile', [
                'bio' => '<b>Artist</b>',
                'country' => 'Iran',
            ])
            ->assertOk()
            ->assertJsonPath('data.bio', 'Artist')
            ->assertJsonPath('data.step', 'completed')
            ->assertJsonPath('data.completed', true);
    }

    public function test_editing_a_reached_earlier_step_does_not_move_progress_back(): void
    {
        [$user, $profile] = $this->userWithProfile('artist_identity');

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/practice', ['practice_answers' => []])
            ->assertOk()
            ->assertJsonPath('data.step', 'artist_identity');

        $this->assertSame('artist_identity', $profile->fresh()->onboarding_step);
    }

    public function test_completed_user_cannot_change_disciplines(): void
    {
        [$user] = $this->userWithProfile('completed');

        $this->actingAs($user, 'web')
            ->putJson('/api/v1/onboarding/disciplines', ['disciplines' => ['painter']])
            ->assertForbidden();
    }

    public function test_onboarding_routes_require_authentication(): void
    {
        $this->getJson('/api/v1/onboarding')->assertUnauthorized();
        $this->putJson('/api/v1/onboarding/disciplines', ['disciplines' => ['painter']])->assertUnauthorized();
    }

    public function test_user_can_only_read_their_own_onboarding_data(): void
    {
        [$userA, $profileA] = $this->userWithProfile();
        [, $profileB] = $this->userWithProfile();
        $profileA->disciplines()->attach(Discipline::query()->where('slug', 'painter')->value('id'));
        $profileB->disciplines()->attach(Discipline::query()->where('slug', 'digital')->value('id'));
        $profileA->custom_disciplines = ['Mosaic'];
        $profileA->save();
        $profileB->custom_disciplines = ['Printmaking'];
        $profileB->save();

        $this->actingAs($userA, 'web')
            ->getJson('/api/v1/onboarding')
            ->assertOk()
            ->assertJsonPath('data.disciplines', ['painter'])
            ->assertJsonPath('data.custom_disciplines', ['Mosaic'])
            ->assertJsonMissing(['digital'])
            ->assertJsonMissing(['Printmaking']);
    }

    public function test_discipline_seeder_is_idempotent(): void
    {
        $disciplineCount = Discipline::query()->count();
        $painterId = Discipline::query()->where('slug', 'painter')->value('id');

        (new DisciplineSeeder)->run();
        (new DisciplineSeeder)->run();

        $this->assertSame($disciplineCount, Discipline::query()->count());
        $this->assertSame($painterId, Discipline::query()->where('slug', 'painter')->value('id'));
    }

    /**
     * @return array{0: User, 1: Profile}
     */
    private function userWithProfile(string $step = 'discover_art'): array
    {
        $user = User::factory()->create();
        $profile = new Profile;
        $profile->user_id = $user->id;
        $profile->onboarding_step = $step;
        $profile->save();

        return [$user, $profile];
    }
}
