import 'xterm/css/xterm.css';

import { useEffect, useRef } from 'react';

import { useActiveTerminalSession } from '@/hooks/use-active-terminal-session';
import { usePushToTalk } from '@/hooks/use-push-to-talk';
import { useVoiceToTerminal } from '@/hooks/use-voice-to-terminal';
import { terminalSessionManager } from '@/lib/terminal-session-manager';

interface XtermTerminalProps {
  taskId: string;
  workingDir?: string;
  terminalSessionId?: string;
}

const FONT_FAMILY = '"SF Mono", Menlo, Monaco, "PingFang TC", monospace';

const TERMINAL_OPTIONS = {
  allowProposedApi: true,
  fontFamily: FONT_FAMILY,
  fontSize: 14,
  cursorBlink: true,
  macOptionClickForcesSelection: true,
  rightClickSelectsWord: true,
  theme: {
    background: '#0a0a0a',
    foreground: '#22c55e',
    cursor: '#22c55e',
  },
} as const;

const ASR_SHORTCUT_KEY = ' ';
const ASR_SHORTCUT_ALT = true;

export function XtermTerminal({ taskId, workingDir, terminalSessionId }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionId = terminalSessionId ?? taskId;
  const isRecordingRef = useRef(false);

  const { setActiveSessionId, setIsRecording, setIsTranscribing } = useActiveTerminalSession();
  const {
    isRecording: pttIsRecording,
    startRecording,
    stopRecording,
    audioBlob,
    reset,
  } = usePushToTalk();
  const { transcribeAndInsert, isTranscribing: vttIsTranscribing } = useVoiceToTerminal();

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId, setActiveSessionId]);

  useEffect(() => {
    setIsRecording(pttIsRecording);
  }, [pttIsRecording, setIsRecording]);

  useEffect(() => {
    setIsTranscribing(vttIsTranscribing);
  }, [vttIsTranscribing, setIsTranscribing]);

  useEffect(() => {
    if (audioBlob) {
      transcribeAndInsert(audioBlob);
      reset();
    }
  }, [audioBlob, transcribeAndInsert, reset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let resizeFrame: number | null = null;

    const customKeyHandler = (event: KeyboardEvent): boolean => {
      if (event.key === ASR_SHORTCUT_KEY && event.altKey === ASR_SHORTCUT_ALT) {
        if (event.type === 'keydown') {
          if (!isRecordingRef.current) {
            isRecordingRef.current = true;
            startRecording();
          }
        }
        return false;
      }
      return true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === ASR_SHORTCUT_KEY && event.altKey === ASR_SHORTCUT_ALT) {
        if (isRecordingRef.current) {
          isRecordingRef.current = false;
          stopRecording();
        }
      }
    };

    void terminalSessionManager
      .getOrCreateTerminal(sessionId, container, {
        workingDir,
        terminalOptions: TERMINAL_OPTIONS,
        customKeyHandler,
      })
      .then(async () => {
        terminalSessionManager.focus(sessionId);
        await terminalSessionManager.fitAndResize(sessionId);
      });

    const scheduleFit = () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        void terminalSessionManager.fitAndResize(sessionId);
      });
    };

    const handleWindowResize = () => {
      scheduleFit();
    };

    const resizeObserver = new ResizeObserver(handleWindowResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('keyup', handleKeyUp);
    scheduleFit();

    return () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('keyup', handleKeyUp);
      resizeObserver.disconnect();
      terminalSessionManager.detachFromContainer(sessionId);
    };
  }, [sessionId, workingDir, startRecording, stopRecording]);

  return (
    <div
      className="h-full flex flex-col bg-[#0a0a0a]"
      onClick={() => terminalSessionManager.focus(sessionId)}
    >
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
