import { apiRequest } from '@/lib/api';

export type OnboardingStep =
  | 'discover_art'
  | 'define_practice'
  | 'artist_identity'
  | 'profile_setup'
  | 'completed';

export type PracticeAnswers = Record<string, string[]>;

export interface OnboardingData {
  step: OnboardingStep;
  completed: boolean;
  disciplines: string[];
  custom_disciplines: string[];
  practice_answers: PracticeAnswers | [];
  display_name: string | null;
  bio: string | null;
  country: string | null;
  socials: Array<{ label: string; url: string }>;
  avatar_url: string | null;
  cover_url: string | null;
}

export interface SaveDisciplinesData {
  disciplines: string[];
  custom_disciplines?: string[];
}

export interface SaveProfileData {
  bio?: string;
  country: 'Iran';
  socials?: Array<{ label: string; url: string }>;
}

interface ApiEnvelope<T> {
  data: T;
}

let onboardingPromise: Promise<OnboardingData> | null = null;

export function getOnboarding(): Promise<OnboardingData> {
  if (!onboardingPromise) {
    onboardingPromise = apiRequest<ApiEnvelope<OnboardingData>>('/api/v1/onboarding')
      .then(({ data }) => data)
      .finally(() => {
        onboardingPromise = null;
      });
  }
  return onboardingPromise;
}

export async function saveDisciplines(payload: SaveDisciplinesData): Promise<OnboardingData> {
  const { data } = await apiRequest<ApiEnvelope<OnboardingData>>('/api/v1/onboarding/disciplines', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data;
}

export async function savePractice(practice_answers: PracticeAnswers): Promise<OnboardingData> {
  const { data } = await apiRequest<ApiEnvelope<OnboardingData>>('/api/v1/onboarding/practice', {
    method: 'PUT',
    body: JSON.stringify({ practice_answers }),
  });
  return data;
}

export async function confirmIdentity(): Promise<OnboardingData> {
  const { data } = await apiRequest<ApiEnvelope<OnboardingData>>('/api/v1/onboarding/identity', {
    method: 'POST',
  });
  return data;
}

export async function saveProfile(payload: SaveProfileData): Promise<OnboardingData> {
  const { data } = await apiRequest<ApiEnvelope<OnboardingData>>('/api/v1/onboarding/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data;
}