# Project rules (Artistry backend)
- Laravel 13 API only (no Blade/views). All routes under /api/v1.
- Auth: Laravel Sanctum cookie-based SPA auth. Frontend: React SPA at https://localhost:5173.
- Database: PostgreSQL. Primary keys: ULID. Always add foreign keys with explicit onDelete and unique constraints at DB level.
- Validate with FormRequest classes. Return JSON via API Resource classes (never return models directly).
- Never accept `role`, `verified`, or any privileged field from the client beyond allowed values. Use $fillable carefully.
- Business logic in Action/Service classes, thin controllers.
- Write PHPUnit feature tests for every endpoint.
- Code style: Laravel Pint. Comments in English.
- Never commit secrets. Never edit .env, only .env.example.