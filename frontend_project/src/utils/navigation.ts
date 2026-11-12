import type { NavigateFunction } from 'react-router-dom';

const CURRENT_USER_HANDLE = 'you';

export function goToProfile(navigate: NavigateFunction, rawHandle: string) {
  const slug = rawHandle.replace('@', '');

  if (slug === CURRENT_USER_HANDLE) {
    navigate('/profile');
  } else {
    navigate(`/artist/${slug}`);
  }
}