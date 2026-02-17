import { AlertCircle, Loader2, Mic } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { usePushToTalk } from '@/hooks/use-push-to-talk';
import { cn } from '@/lib/utils';

export interface VoiceInputButtonProps {
  onTranscriptReady: (blob: Blob) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscriptReady,
  disabled,
  className,
}: VoiceInputButtonProps) {
  const { isRecording, startRecording, stopRecording, audioBlob, error, reset } = usePushToTalk();

  // Handle audio blob availability
  useEffect(() => {
    if (audioBlob) {
      // Small artificial delay to show the "Transcribing" state if it processes super fast,
      // and to ensure the state transition is visible.
      // In a real app with a real async transcription, we'd probably have an 'isTranscribing' prop.
      // Since we don't, this visual feedback relies on the blob being present before reset.
      const timer = setTimeout(() => {
        onTranscriptReady(audioBlob);
        reset();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [audioBlob, onTranscriptReady, reset]);

  // Derived state
  // If isRecording -> RECORDING
  // If audioBlob -> TRANSCRIBING (transient)
  // If error -> ERROR
  // Else -> IDLE

  // Since we reset immediately in the effect, we might miss the transcribing state visually.
  // I will add a small delay in the effect to make it visible, just in case.
  // Or better, I'll rely on `isRecording`.

  // Let's refine the states.
  // IDLE: default
  // RECORDING: isRecording === true
  // TRANSCRIBING: audioBlob !== null (before we reset)
  // ERROR: error !== null

  return (
    <Button
      variant="ghost" // matching terminal sidebar style (transparent/ghost)
      size="sm"
      disabled={disabled || (!!error && !isRecording)} // Allow retry if error?
      className={cn(
        'font-mono uppercase tracking-[0.15em] text-xs h-auto py-2 px-3', // Base terminal style
        // Idle
        !isRecording &&
          !audioBlob &&
          !error &&
          'text-[rgba(255,255,255,0.5)] hover:text-[#00FF00] hover:bg-[rgba(0,255,0,0.1)]',
        // Recording
        isRecording &&
          'text-red-500 bg-red-500/10 hover:bg-red-500/20 animate-pulse border-red-500/30',
        // Transcribing (audioBlob present)
        !!audioBlob && 'text-blue-400 cursor-wait',
        // Error
        !!error && 'text-red-500 hover:text-red-400',
        className
      )}
      onPointerDown={(e) => {
        if (disabled || error) return;
        e.preventDefault();
        startRecording();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        stopRecording();
      }}
      onPointerLeave={() => {
        if (isRecording) {
          stopRecording();
        }
      }}
      onPointerCancel={() => {
        if (isRecording) {
          stopRecording();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Content switch based on state */}
      {error ? (
        <>
          <AlertCircle className="h-3 w-3 mr-1.5" />
          <span title={error.message}>Error</span>
        </>
      ) : audioBlob ? (
        <>
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
          <span>Transcribing...</span>
        </>
      ) : isRecording ? (
        <>
          <div className="h-2 w-2 mr-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span>Recording...</span>
        </>
      ) : (
        <>
          <Mic className="h-3 w-3 mr-1.5" />
          <span>Voice</span>
        </>
      )}
    </Button>
  );
}
