import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OnboardingState, UserRole } from '@/types';
import { authStateFromUser, getCurrentUser, initialAuthState, signIn, signOut as authSignOut, signUp, type AuthState, type SignUpData } from '@/services/authService';
import { ApiError } from '@/lib/api';
import { confirmIdentity as apiConfirmIdentity, getOnboarding, saveDisciplines as apiSaveDisciplines, savePractice as apiSavePractice, saveProfile as apiSaveProfile, type OnboardingData, type OnboardingStep, type PracticeAnswers, type SaveDisciplinesData, type SaveProfileData } from '@/services/onboardingService';
import { clearProfile, saveProfile as saveLocalProfile } from '@/services/profileService';

export const MAX_DISCIPLINES = 5;

interface OnboardingContextValue {
  state: OnboardingState;
  auth: AuthState;
  loading: boolean;
  onboardingStep: OnboardingStep;
  update: (patch: Partial<OnboardingState>) => void;
  setRole: (role: UserRole) => void;
  toggleCategory: (id: string) => void;
  setPracticeAnswer: (questionId: string, values: string[]) => void;
  addCustomDiscipline: (label: string) => void;
  authenticateExistingUser: (email: string, password: string) => Promise<void>;
  createNewUser: (data: SignUpData) => Promise<void>;
  completeOnboarding: () => void;
  signOut: () => Promise<void>;
  getAuthenticatedDestination: () => string;
  refreshOnboarding: () => Promise<OnboardingData>;
  saveDisciplines: (payload: SaveDisciplinesData) => Promise<OnboardingData>;
  savePractice: (answers: PracticeAnswers) => Promise<OnboardingData>;
  confirmIdentity: () => Promise<OnboardingData>;
  saveOnboardingProfile: (payload: SaveProfileData) => Promise<OnboardingData>;
  reset: () => Promise<void>;
}

const initialState: OnboardingState = {
  role: 'visitor', fullName: '', username: '', email: '', categories: [], disciplines: [],
  practiceAnswers: {}, customDisciplines: [], displayName: '', bio: '', country: '',
  avatarUrl: '', coverUrl: '', socials: [], verificationRequested: false,
};

const onboardingPath: Record<OnboardingStep, string> = {
  discover_art: '/discover-art',
  define_practice: '/discover-practice',
  artist_identity: '/artist-identity',
  profile_setup: '/profile-setup',
  completed: '/app',
};

function normalizedPracticeAnswers(value: OnboardingData['practice_answers']): PracticeAnswers {
  return Array.isArray(value) ? {} : value;
}

function stateFromUser(user: NonNullable<AuthState['user']>): OnboardingState {
  const profile = user.profile;
  const customDisciplines = profile.custom_disciplines ?? [];
  const disciplines = [...(profile.disciplines ?? []), ...customDisciplines.map((item) => `custom:${item}`)];
  return {
    ...initialState,
    role: user.role,
    fullName: user.full_name,
    username: user.username,
    email: user.email,
    disciplines,
    categories: disciplines,
    customDisciplines,
    practiceAnswers: profile.practice_answers ? normalizedPracticeAnswers(profile.practice_answers) : {},
    displayName: profile.display_name ?? '',
    bio: profile.bio ?? '',
    country: profile.country ?? '',
    socials: profile.socials ?? [],
    avatarUrl: profile.avatar_url ?? '',
    coverUrl: profile.cover_url ?? '',
  };
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const signOutPromise = useRef<Promise<void> | null>(null);
  const signOutStarted = useRef(false);
  const authRef = useRef<AuthState>(initialAuthState);
  const [state, setState] = useState<OnboardingState>(initialState);
  const [auth, setAuth] = useState<AuthState>(initialAuthState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loading && auth.isAuthenticated) void saveLocalProfile(state);
  }, [auth.isAuthenticated, loading, state]);

  const commitAuth = (nextAuth: AuthState) => {
    authRef.current = nextAuth;
    setAuth(nextAuth);
  };

  const applyOnboardingData = (data: OnboardingData) => {
    const disciplines = [...data.disciplines, ...data.custom_disciplines.map((item) => `custom:${item}`)];
    setState((current) => ({
      ...current,
      disciplines,
      categories: disciplines,
      customDisciplines: data.custom_disciplines,
      practiceAnswers: normalizedPracticeAnswers(data.practice_answers),
      displayName: data.display_name ?? '',
      bio: data.bio ?? '',
      country: data.country ?? '',
      socials: data.socials ?? [],
      avatarUrl: data.avatar_url ?? current.avatarUrl,
      coverUrl: data.cover_url ?? current.coverUrl,
    }));
    commitAuth({
      ...authRef.current,
      isNewUser: !data.completed,
      hasCompletedOnboarding: data.completed,
      onboardingStep: data.step,
    });
  };

  const refreshOnboarding = async (): Promise<OnboardingData> => {
    const data = await getOnboarding();
    applyOnboardingData(data);
    return data;
  };

  const recoverStepConflict = async (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 409 || error.code !== 'onboarding_step_not_reached') return;
    try {
      const data = await refreshOnboarding();
      navigate(onboardingPath[data.step], { replace: true });
    } catch {
      // Keep the original API error for the submitting screen.
    }
  };

  const persistStep = async (request: () => Promise<OnboardingData>): Promise<OnboardingData> => {
    try {
      const data = await request();
      applyOnboardingData(data);
      return data;
    } catch (error) {
      await recoverStepConflict(error);
      throw error;
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const user = await getCurrentUser();
        if (!active) return;
        if (!user) {
          commitAuth(initialAuthState);
          setState(initialState);
          await clearProfile();
          return;
        }

        const nextAuth = authStateFromUser(user);
        commitAuth(nextAuth);
        setState(stateFromUser(user));
        if (!nextAuth.hasCompletedOnboarding) {
          try {
            await refreshOnboarding();
          } catch {
            // Keep the authenticated user and the onboarding step from /me.
          }
        }
      } catch {
        if (active) commitAuth(initialAuthState);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const update = (patch: Partial<OnboardingState>) =>
    setState((current) => {
      const next = { ...current, ...patch };
      if ('disciplines' in patch) next.categories = next.disciplines;
      else if ('categories' in patch) next.disciplines = next.categories;
      return next;
    });

  const setRole = (role: UserRole) => {
    setState((current) => ({ ...current, role }));
  };

  const toggleCategory = (id: string) =>
    setState((current) => {
      const isSelected = current.disciplines.includes(id);
      if (!isSelected && current.disciplines.length >= MAX_DISCIPLINES) return current;

      return {
        ...current,
        categories: isSelected
          ? current.categories.filter((category) => category !== id)
          : [...current.categories, id],
        disciplines: isSelected
          ? current.disciplines.filter((discipline) => discipline !== id)
          : [...current.disciplines, id],
      };
    });

  const setPracticeAnswer = (questionId: string, values: string[]) =>
    setState((current) => ({
      ...current,
      practiceAnswers: { ...current.practiceAnswers, [questionId]: values },
    }));

  const addCustomDiscipline = (label: string) =>
    setState((current) => {
      const normalized = label.trim();
      if (
        !normalized ||
        current.disciplines.length >= MAX_DISCIPLINES ||
        current.customDisciplines.some((item) => item.toLowerCase() === normalized.toLowerCase())
      ) return current;
      return {
        ...current,
        customDisciplines: [...current.customDisciplines, normalized],
        disciplines: [...current.disciplines, `custom:${normalized}`],
        categories: [...current.categories, `custom:${normalized}`],
      };
    });

  const authenticateExistingUser = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const nextAuth = await signIn(email, password);
      signOutStarted.current = false;
      commitAuth(nextAuth);
      setState(nextAuth.user ? stateFromUser(nextAuth.user) : initialState);
      if (!nextAuth.hasCompletedOnboarding) await refreshOnboarding();
    } finally {
      setLoading(false);
    }
  };

  const createNewUser = async (data: SignUpData): Promise<void> => {
    setLoading(true);
    try {
      const nextAuth = await signUp(data);
      signOutStarted.current = false;
      commitAuth(nextAuth);
      setState(nextAuth.user ? stateFromUser(nextAuth.user) : {
        ...initialState,
        fullName: data.full_name,
        username: data.username,
        email: data.email,
        role: nextAuth.userRole,
      });
      if (!nextAuth.hasCompletedOnboarding) await refreshOnboarding();
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = () => {
    commitAuth({ ...authRef.current, isNewUser: false, hasCompletedOnboarding: true, onboardingStep: 'completed' });
  };

  const signOut = (): Promise<void> => {
    if (signOutPromise.current) return signOutPromise.current;
    if (signOutStarted.current) return Promise.resolve();

    signOutStarted.current = true;
    const request = (async () => {
      try {
        await authSignOut();
      } catch {
        // Logout is best-effort; local authentication must still be cleared.
      } finally {
        commitAuth(initialAuthState);
        setState(initialState);
        await clearProfile();
        navigate('/login', { replace: true });
        signOutPromise.current = null;
      }
    })();
    signOutPromise.current = request;
    return request;
  };

  const getAuthenticatedDestination = (): string => onboardingPath[authRef.current.onboardingStep];

  const saveOnboardingDisciplines = (payload: SaveDisciplinesData) =>
    persistStep(() => apiSaveDisciplines(payload));
  const saveOnboardingPractice = (answers: PracticeAnswers) =>
    persistStep(() => apiSavePractice(answers));
  const confirmOnboardingIdentity = () => persistStep(apiConfirmIdentity);
  const saveOnboardingProfile = (payload: SaveProfileData) =>
    persistStep(() => apiSaveProfile(payload));

  const reset = async (): Promise<void> => {
    setState(initialState);
    await clearProfile();
    commitAuth(initialAuthState);
  };

  return (
    <OnboardingContext.Provider
      value={{
        state,
        auth,
        loading,
        onboardingStep: auth.onboardingStep,
        update,
        setRole,
        toggleCategory,
        setPracticeAnswer,
        addCustomDiscipline,
        authenticateExistingUser,
        createNewUser,
        completeOnboarding,
        signOut,
        getAuthenticatedDestination,
        refreshOnboarding,
        saveDisciplines: saveOnboardingDisciplines,
        savePractice: saveOnboardingPractice,
        confirmIdentity: confirmOnboardingIdentity,
        saveOnboardingProfile,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}
