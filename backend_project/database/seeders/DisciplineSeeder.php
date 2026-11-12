<?php

namespace Database\Seeders;

use App\Models\Discipline;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DisciplineSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = json_decode(
            file_get_contents(database_path('data/onboarding-catalog.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );

        $now = now();
        $disciplines = array_map(fn (array $discipline): array => [
            'id' => (string) Str::ulid(),
            'slug' => $discipline['slug'],
            'name' => $discipline['name'],
            'category_slug' => $discipline['category_slug'],
            'created_at' => $now,
            'updated_at' => $now,
        ], $catalog['disciplines']);

        Discipline::query()->upsert($disciplines, ['slug'], ['name', 'category_slug', 'updated_at']);
    }
}
