import { useCallback, useState } from 'react';

import { isValidTranscript, sanitizeTranscript } from '@/lib/transcript-utils';
import {
  isTranscriptionResponse,
  terminalSessionManager,
  transcribeAudio,
} from '@/lib/transcription';

import { useActiveTerminalSession } from './use-active-terminal-session';

interface UseVoiceToTerminalReturn {
  transcribeAndInsert: (audioBlob: Blob) => Promise<void>;
  isTranscribing: boolean;
  error: Error | null;
  reset: () => void;
}

export function useVoiceToTerminal(): UseVoiceToTerminalReturn {
  const { activeSessionId } = useActiveTerminalSession();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const transcribeAndInsert = useCallback(
    async (audioBlob: Blob) => {
      if (!activeSessionId) {
        setError(new Error('No active terminal session'));
        return;
      }

      setIsTranscribing(true);
      setError(null);

      try {
        const arrayBuffer = await audioBlob.arrayBuffer();

        const result = await transcribeAudio(arrayBuffer);

        if (!isTranscriptionResponse(result)) {
          setError(new Error(result.message));
          return;
        }

        const rawText = result.text;
        const sanitizedText = sanitizeTranscript(rawText);

        if (!isValidTranscript(sanitizedText)) {
          return;
        }

        await terminalSessionManager.insertText(activeSessionId, sanitizedText);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Transcription failed');
        setError(error);
      } finally {
        setIsTranscribing(false);
      }
    },
    [activeSessionId]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsTranscribing(false);
  }, []);

  return {
    transcribeAndInsert,
    isTranscribing,
    error,
    reset,
  };
}
