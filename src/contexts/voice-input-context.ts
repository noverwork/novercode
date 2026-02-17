import { createContext } from 'react';

interface VoiceInputContextValue {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export const VoiceInputContext = createContext<VoiceInputContextValue | undefined>(undefined);
