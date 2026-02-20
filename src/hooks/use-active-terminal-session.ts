import { useContext } from 'react';

import { VoiceInputContext } from '@/contexts/voice-input-context';

export function useActiveTerminalSession() {
  const context = useContext(VoiceInputContext);
  if (context === undefined) {
    throw new Error('useActiveTerminalSession must be used within a VoiceInputProvider');
  }

  return {
    activeSessionId: context.activeSessionId,
    hasActiveTerminal: context.activeSessionId !== null,
    setActiveSessionId: context.setActiveSessionId,
    isRecording: context.isRecording,
    isTranscribing: context.isTranscribing,
    setIsRecording: context.setIsRecording,
    setIsTranscribing: context.setIsTranscribing,
  };
}

export function useVoiceInput() {
  return useActiveTerminalSession();
}
