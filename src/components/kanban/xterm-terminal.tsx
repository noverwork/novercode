import 'xterm/css/xterm.css';

import { useEffect, useRef } from 'react';

import { useActiveTerminalSession } from '@/hooks/use-active-terminal-session';
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

export function XtermTerminal({ taskId, workingDir, terminalSessionId }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionId = terminalSessionId ?? taskId;

  const { setActiveSessionId } = useActiveTerminalSession();

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId, setActiveSessionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let resizeFrame: number | null = null;

    void terminalSessionManager
      .getOrCreateTerminal(sessionId, container, {
        workingDir,
        terminalOptions: TERMINAL_OPTIONS,
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
    scheduleFit();

    return () => {
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      terminalSessionManager.detachFromContainer(sessionId);
    };
  }, [sessionId, workingDir]);

  return (
    <div
      className="h-full flex flex-col bg-[#0a0a0a]"
      onClick={() => terminalSessionManager.focus(sessionId)}
    >
      <div ref={containerRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
