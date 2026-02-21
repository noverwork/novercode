import { useState } from 'react';

import { VoiceInputContext } from './voice-input-context';

export function VoiceInputProvider({ children }: { children: React.ReactNode }) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  return (
    <VoiceInputContext.Provider value={{ activeSessionId, setActiveSessionId }}>
      {children}
    </VoiceInputContext.Provider>
  );
}
