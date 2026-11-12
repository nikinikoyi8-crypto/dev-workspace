<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bio' => ['sometimes', 'nullable', 'string', 'max:200'],
            'country' => ['required', 'string', 'in:Iran'],
            'socials' => ['sometimes', 'array', 'max:10'],
            'socials.*' => ['required', 'array:label,url'],
            'socials.*.label' => ['required', 'string', 'max:30'],
            'socials.*.url' => ['required', 'string', 'max:200', 'url:http,https'],
            'avatar_url' => ['missing'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('bio'))) {
            $this->merge(['bio' => strip_tags($this->input('bio'))]);
        }
    }
}
