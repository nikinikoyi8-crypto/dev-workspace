import { LucideIcon } from 'lucide-react';

export type UserRole = 'visitor' | 'artist';

export interface ArtDiscipline {
  id: string;
  label: string;
  icon: LucideIcon;
  group?: string;
}

export type ArtCategory = ArtDiscipline;

export interface Artist {
  id: string;
  name: string;
  username: string;
  avatar: string;
  categories: string[];
  verified: boolean;
  followers: number;
  works: number;
  bio: string;
}

export interface OnboardingState {
  role: UserRole;
  fullName: string;
  username: string;
  email: string;
  categories: string[];
  disciplines: string[];
  practiceAnswers: Record<string, string[]>;
  customDisciplines: string[];
  displayName: string;
  bio: string;
  country: string;
  avatarUrl: string;
  coverUrl: string;
  socials: { label: string; url: string }[];
  verificationRequested: boolean;
}
