import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

interface VoiceStatusIndicatorProps {
  isRecording: boolean;
  isTranscribing: boolean;
  className?: string;
}

export function VoiceStatusIndicator({
  isRecording,
  isTranscribing,
  className,
}: VoiceStatusIndicatorProps) {
  if (!isRecording && !isTranscribing) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-2 rounded-full',
        'font-mono text-xs uppercase tracking-wider',
        'backdrop-blur-md border shadow-lg',
        isRecording && 'bg-red-500/20 border-red-500/50 text-red-400',
        isTranscribing && 'bg-blue-500/20 border-blue-500/50 text-blue-400',
        className
      )}
    >
      {isRecording && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span>Recording...</span>
        </>
      )}
      {isTranscribing && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Transcribing...</span>
        </>
      )}
    </div>
  );
}
