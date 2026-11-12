import type { UserRole } from '@/types';
import { ApiError, apiRequest } from '@/lib/api';
import type { OnboardingStep, PracticeAnswers } from '@/services/onboardingService';

export interface AuthUser {
  id: number | string;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  profile: {
    onboarding_step?: OnboardingStep;
    onboarding_completed?: boolean;
    disciplines?: string[];
    custom_disciplines?: string[];
    practice_answers?: PracticeAnswers | [];
    display_name?: string | null;
    bio?: string | null;
    country?: string | null;
    socials?: Array<{ label: string; url: string }>;
    avatar_url?: string | null;
    cover_url?: string | null;
    [key: string]: unknown;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  isNewUser: boolean;
  hasCompletedOnboarding: boolean;
  onboardingStep: OnboardingStep;
  userRole: UserRole;
  user: AuthUser | null;
}

export interface SignUpData {
  full_name: string;
  username: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: UserRole;
}

interface AuthResponse {
  data: AuthUser;
}

let currentUserPromise: Promise<AuthUser | null> | null = null;

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  isNewUser: false,
  hasCompletedOnboarding: false,
  onboardingStep: 'discover_art',
  userRole: 'visitor',
  user: null,
};

export function authStateFromUser(
  user: AuthUser,
): AuthState {
  const hasCompletedOnboarding = user.profile.onboarding_completed ?? false;
  return {
    isAuthenticated: true,
    isNewUser: !hasCompletedOnboarding,
    hasCompletedOnboarding,
    onboardingStep: hasCompletedOnboarding ? 'completed' : user.profile.onboarding_step ?? 'discover_art',
    userRole: user.role,
    user,
  };
}

export async function signIn(email: string, password: string): Promise<AuthState> {
  const response = await apiRequest<AuthResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return authStateFromUser(response.data);
}

export async function signUp(data: SignUpData): Promise<AuthState> {
  const response = await apiRequest<AuthResponse>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return authStateFromUser(response.data);
}

export async function signOut(): Promise<void> {
  await apiRequest<void>('/api/v1/auth/logout', { method: 'POST' });
}

export function getCurrentUser(): Promise<AuthUser | null> {
  if (!currentUserPromise) {
    currentUserPromise = apiRequest<AuthResponse>('/api/v1/auth/me')
      .then((response) => response.data)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      })
      .finally(() => {
        currentUserPromise = null;
      });
  }
  return currentUserPromise;
}