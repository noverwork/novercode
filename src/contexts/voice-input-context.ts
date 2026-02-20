import { createContext } from 'react';

interface VoiceInputContextValue {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  isRecording: boolean;
  isTranscribing: boolean;
  setIsRecording: (v: boolean) => void;
  setIsTranscribing: (v: boolean) => void;
}

export const VoiceInputContext = createContext<VoiceInputContextValue | undefined>(undefined);
