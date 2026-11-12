<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Discipline extends Model
{
    use HasFactory, HasUlids;

    protected $fillable = [
        'slug',
        'name',
        'category_slug',
    ];

    public function profiles(): BelongsToMany
    {
        return $this->belongsToMany(Profile::class);
    }
}
