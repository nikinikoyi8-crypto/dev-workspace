import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type ReelsAudioContextValue = {
  muted: boolean;
  setMuted: (muted: boolean) => void;
};

const ReelsAudioContext = createContext<ReelsAudioContextValue | null>(null);

export function ReelsAudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true);

  return (
    <ReelsAudioContext.Provider value={{ muted, setMuted }}>
      {children}
    </ReelsAudioContext.Provider>
  );
}

export function useReelsAudio() {
  const context = useContext(ReelsAudioContext);

  if (!context) {
    return { muted: true, setMuted: (_muted: boolean) => {} };
  }

  return context;
}
