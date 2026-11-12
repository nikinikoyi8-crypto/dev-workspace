import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { SavedProvider } from '@/context/SavedContext';
import { FollowingProvider } from '@/context/FollowingContext';
import { EngagementProvider } from '@/context/EngagementContext';
import { ReelsAudioProvider } from '@/context/ReelsAudioContext';
import { StoriesProvider } from '@/context/StoriesContext';
import { PostFeedProvider } from '@/context/PostFeedContext';
import { StoryViewerHost } from '@/components/stories/StoryViewer';
import { PageTransition } from '@/components/PageTransition';
import Splash from '@/pages/Splash';
import Welcome from '@/pages/Welcome';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import DiscoverYourArt from '@/pages/DiscoverYourArt';
import DefinePractice from '@/pages/DefinePractice';
import ArtistIdentity from '@/pages/ArtistIdentity';
import ProfileSetup from '@/pages/ProfileSetup';
import MainApp, { ARTWORKS } from '@/pages/MainApp';
import Profile from '@/pages/Profile';
import Explore from '@/pages/Explore';
import EditProfile from '@/pages/EditProfile';
import ProfileOptions from '@/pages/ProfileOptions';
import SavedItems from '@/pages/SavedItems';
import ArtistProfile from '@/pages/ArtistProfile';
import Search from '@/pages/Search';
import Notifications from '@/pages/Notifications';
import Direct from '@/pages/Direct';
import { useOnboarding } from '@/context/OnboardingContext';
import type { ReactNode } from 'react';

function OnboardingRoute({ children }: { children: ReactNode }) {
  const { auth, loading, getAuthenticatedDestination } = useOnboarding();
  const { pathname } = useLocation();
  const onboardingRoutes = ['/discover-art', '/discover-practice', '/artist-identity', '/profile-setup'];
  if (loading) return null;
  if (!auth.isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }
  if (auth.isAuthenticated && auth.hasCompletedOnboarding) {
    return <Navigate to="/app" replace />;
  }
  const requestedIndex = onboardingRoutes.indexOf(pathname);
  const currentIndex = onboardingRoutes.indexOf(getAuthenticatedDestination());
  if (requestedIndex > currentIndex) return <Navigate to={getAuthenticatedDestination()} replace />;
  return <>{children}</>;
}

function ProtectedAppRoute({ children }: { children: ReactNode }) {
  const { auth, loading, getAuthenticatedDestination } = useOnboarding();
  if (loading) return null;
  if (!auth.isAuthenticated) {
    return <Navigate to="/welcome" replace />;
  }
  if (!auth.hasCompletedOnboarding) return <Navigate to={getAuthenticatedDestination()} replace />;
  return <>{children}</>;
}

const PROFILE_SEED_ITEMS = [
  ...ARTWORKS,
  ...ARTWORKS.map((work) => ({ ...work, id: work.id + ARTWORKS.length })),
];

export default function App() {
  return (
    <BrowserRouter>
      <OnboardingProvider>
        <SavedProvider>
          <FollowingProvider>
          <PostFeedProvider>
          <StoriesProvider>
            <EngagementProvider seedItems={PROFILE_SEED_ITEMS}>
              <ReelsAudioProvider>
                <PageTransition>
                  <Routes>
                    <Route path="/" element={<Splash />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/categories" element={<Navigate to="/discover-art" replace />} />
                    <Route path="/discover-art" element={<OnboardingRoute><DiscoverYourArt /></OnboardingRoute>} />
                    <Route path="/discover-practice" element={<OnboardingRoute><DefinePractice /></OnboardingRoute>} />
                    <Route path="/artist-identity" element={<OnboardingRoute><ArtistIdentity /></OnboardingRoute>} />
                    <Route
                      path="/profile-setup"
                      element={
                        <OnboardingRoute>
                          <ProfileSetup />
                        </OnboardingRoute>
                      }
                    />
                    <Route
                      path="/app"
                      element={
                        <ProtectedAppRoute>
                          <MainApp />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <ProtectedAppRoute>
                          <Profile />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/explore"
                      element={
                        <ProtectedAppRoute>
                          <Explore />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/search"
                      element={<ProtectedAppRoute><Search /></ProtectedAppRoute>}
                    />
                    <Route
                      path="/notifications"
                      element={<ProtectedAppRoute><Notifications /></ProtectedAppRoute>}
                    />
                    <Route
                      path="/direct"
                      element={<ProtectedAppRoute><Direct /></ProtectedAppRoute>}
                    />
                    <Route
                      path="/profile/edit-profile"
                      element={
                        <ProtectedAppRoute>
                          <EditProfile />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/profile/options"
                      element={
                        <ProtectedAppRoute>
                          <ProfileOptions />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/profile/saved"
                      element={
                        <ProtectedAppRoute>
                          <SavedItems />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route
                      path="/artist/:handle"
                      element={
                        <ProtectedAppRoute>
                          <ArtistProfile />
                        </ProtectedAppRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </PageTransition>
                <StoryViewerHost />
              </ReelsAudioProvider>
            </EngagementProvider>
          </StoriesProvider>
          </PostFeedProvider>
            </FollowingProvider>
        </SavedProvider>
      </OnboardingProvider>
    </BrowserRouter>
  );
}
