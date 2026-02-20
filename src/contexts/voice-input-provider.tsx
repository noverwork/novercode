import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

import { VoiceInputContext } from './voice-input-context';

interface Settings {
  asrShortcut?: string | null;
}

export function VoiceInputProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    invoke<Settings>('get_settings').catch(console.error);
  }, []);

  return (
    <VoiceInputContext.Provider
      value={{
        activeSessionId,
        setActiveSessionId,
        isRecording,
        isTranscribing,
        setIsRecording,
        setIsTranscribing,
      }}
    >
      {children}
    </VoiceInputContext.Provider>
  );
}
