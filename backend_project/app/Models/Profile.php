<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Profile extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'display_name',
        'bio',
        'country',
        'avatar_url',
        'cover_url',
        'socials',
        'custom_disciplines',
        'practice_answers',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'socials' => 'array',
        'custom_disciplines' => 'array',
        'practice_answers' => 'array',
        'verification_requested' => 'boolean',
        'onboarding_completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function disciplines(): BelongsToMany
    {
        return $this->belongsToMany(Discipline::class);
    }
}
