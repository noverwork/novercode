import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePushToTalkReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  audioBlob: Blob | null;
  error: Error | null;
  reset: () => void;
}

export function usePushToTalk(): UsePushToTalkReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setError(null);
  }, []);

  const cleanup = useCallback(() => {
    // Clear timeout
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Reset recorder ref
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // If recorder is not active but we need to cleanup (e.g. error or forced stop)
      cleanup();
      setIsRecording(false);
    }
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    reset();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setIsRecording(false);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      timerRef.current = window.setTimeout(() => {
        stopRecording();
      }, 30000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(err instanceof Error ? err : new Error('Failed to start recording'));
      cleanup();
      setIsRecording(false);
    }
  }, [isRecording, cleanup, stopRecording, reset]);

  // Handle window blur
  useEffect(() => {
    const handleBlur = () => {
      if (isRecording) {
        stopRecording();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    audioBlob,
    error,
    reset,
  };
}
