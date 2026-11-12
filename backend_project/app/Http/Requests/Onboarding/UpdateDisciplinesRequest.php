<?php

namespace App\Http\Requests\Onboarding;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateDisciplinesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->profile?->onboarding_step !== 'completed';
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'disciplines' => ['required', 'array', 'min:1', 'max:5'],
            'disciplines.*' => ['required', 'string', 'distinct:strict', Rule::exists('disciplines', 'slug')],
            'custom_disciplines' => ['sometimes', 'array', 'max:5'],
            'custom_disciplines.*' => ['required', 'string', 'min:2', 'max:40'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $customDisciplines = $this->input('custom_disciplines');

        if (is_array($customDisciplines)) {
            $this->merge([
                'custom_disciplines' => array_map(
                    fn (mixed $discipline): mixed => is_string($discipline)
                        ? trim(strip_tags($discipline))
                        : $discipline,
                    $customDisciplines,
                ),
            ]);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $disciplines = $this->input('custom_disciplines', []);

            if (! is_array($disciplines)) {
                return;
            }

            $normalized = array_map(fn (mixed $value): mixed => is_string($value) ? mb_strtolower($value) : $value, $disciplines);

            if (count($normalized) !== count(array_unique($normalized, SORT_REGULAR))) {
                $validator->errors()->add('custom_disciplines', 'Custom disciplines must be unique.');
            }
        });
    }
}
