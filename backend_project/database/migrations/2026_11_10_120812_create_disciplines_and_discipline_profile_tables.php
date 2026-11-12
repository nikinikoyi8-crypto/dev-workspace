<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('disciplines', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('category_slug');
            $table->timestamps();
        });

        Schema::create('discipline_profile', function (Blueprint $table) {
            $table->foreignUlid('profile_id')->constrained()->cascadeOnDelete();
            $table->foreignUlid('discipline_id')->constrained()->cascadeOnDelete();
            $table->unique(['profile_id', 'discipline_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('discipline_profile');
        Schema::dropIfExists('disciplines');
    }
};
