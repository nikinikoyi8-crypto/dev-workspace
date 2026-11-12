<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $table->jsonb('custom_disciplines')->default('[]');
            $table->jsonb('practice_answers')->default('{}');
            $table->string('onboarding_step')->default('discover_art');
            $table->timestampTz('onboarding_completed_at')->nullable();
        });

        DB::statement("ALTER TABLE profiles ADD CONSTRAINT profiles_onboarding_step_check CHECK (onboarding_step IN ('discover_art', 'define_practice', 'artist_identity', 'profile_setup', 'completed'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE profiles DROP CONSTRAINT profiles_onboarding_step_check');

        Schema::table('profiles', function (Blueprint $table) {
            $table->dropColumn(['custom_disciplines', 'practice_answers', 'onboarding_step', 'onboarding_completed_at']);
        });
    }
};
