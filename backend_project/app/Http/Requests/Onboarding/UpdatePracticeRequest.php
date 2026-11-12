<?php

namespace App\Http\Requests\Onboarding;

use App\Support\OnboardingCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdatePracticeRequest extends FormRequest
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
            'practice_answers' => ['present', 'array', 'max:30'],
            'practice_answers.*' => ['present', 'array', 'max:20'],
            'practice_answers.*.*' => ['required', 'string', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $answers = $this->input('practice_answers');

            if (! is_array($answers)) {
                return;
            }

            $questions = [];

            foreach (OnboardingCatalog::read()['practice_questions'] as $question) {
                $questions[$question['id']] = array_column($question['options'], 'slug');
            }

            foreach ($answers as $questionId => $selectedOptions) {
                if (! is_string($questionId) || ! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $questionId)) {
                    $validator->errors()->add('practice_answers', 'Question keys must be slug-like.');

                    continue;
                }

                if (! array_key_exists($questionId, $questions)) {
                    $validator->errors()->add("practice_answers.{$questionId}", 'The selected question is not in the onboarding catalog.');

                    continue;
                }

                if (! is_array($selectedOptions)) {
                    continue;
                }

                foreach ($selectedOptions as $index => $option) {
                    if (is_string($option) && ! in_array($option, $questions[$questionId], true)) {
                        $validator->errors()->add("practice_answers.{$questionId}.{$index}", 'The selected answer is not valid for this question.');
                    }
                }
            }
        });
    }
}
