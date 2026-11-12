import type { OnboardingState } from '@/types';

export type Profile = OnboardingState & { id: string };
export type ProfilePatch = Partial<OnboardingState>;

export interface UploadedAvatar {
  url: string;
  name: string;
  type: string;
  size: number;
}

const PROFILE_STORAGE_KEY = 'artistry_state';

const initialProfile: OnboardingState = {
  role: 'visitor',
  fullName: '',
  username: '',
  email: '',
  categories: [],
  disciplines: [],
  practiceAnswers: {},
  customDisciplines: [],
  displayName: '',
  bio: '',
  country: '',
  avatarUrl: '',
  coverUrl: '',
  socials: [],
  verificationRequested: false,
};

function readStoredProfile(): OnboardingState {
  try {
    const saved = sessionStorage.getItem(PROFILE_STORAGE_KEY);
    return saved ? { ...initialProfile, ...JSON.parse(saved) } : initialProfile;
  } catch {
    return initialProfile;
  }
}

function profileResult(profile: OnboardingState, id: string): Profile {
  return { ...profile, id };
}

export function getInitialProfile(): OnboardingState {
  return readStoredProfile();
}

export async function getProfile(id: string): Promise<Profile | null> {
  return profileResult(readStoredProfile(), id);
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
  const profile = { ...readStoredProfile(), ...patch };
  try {
    sessionStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {}
  return profileResult(profile, id);
}

export async function saveProfile(profile: OnboardingState, id = 'mock-user'): Promise<Profile> {
  return updateProfile(id, profile);
}

export async function uploadAvatar(file: File): Promise<UploadedAvatar> {
  return {
    url: URL.createObjectURL(file),
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export async function clearProfile(): Promise<void> {
  try {
    sessionStorage.removeItem(PROFILE_STORAGE_KEY);
  } catch {}
}