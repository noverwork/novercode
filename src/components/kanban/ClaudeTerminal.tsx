import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, RotateCcw, Plus } from "lucide-react";
import { ptyManager } from "@/lib/pty-manager";

interface ClaudeTerminalProps {
  taskId: string;
  workingDir?: string;
}

export function ClaudeTerminal({ taskId, workingDir }: ClaudeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  const connectToPty = useCallback(() => {
    if (!termRef.current || !taskId) return;

    const term = termRef.current;

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const isNew = !ptyManager.has(taskId);
    ptyManager.getOrCreate(taskId, { workingDir });

    if (isNew) {
      term.writeln("\x1b[33m[Starting new Claude Code session...]\x1b[0m");
    } else {
      term.writeln("\x1b[33m[Reconnecting to session...]\x1b[0m");
      const buffer = ptyManager.getBuffer(taskId);
      buffer.forEach((chunk) => term.write(chunk));
    }

    unsubscribeRef.current = ptyManager.subscribe(taskId, (data) => {
      term.write(data);
    });

    const disposable = term.onData((data) => {
      ptyManager.write(taskId, data);
    });

    ptyManager.resize(taskId, term.cols, term.rows);

    return () => {
      disposable.dispose();
    };
  }, [taskId, workingDir]);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current) return;

    // 清理舊終端
    if (termRef.current) {
      termRef.current.dispose();
      termRef.current = null;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: "#0a0a0a",
        foreground: "#22c55e",
        cursor: "#22c55e",
        cursorAccent: "#0a0a0a",
        selectionBackground: "#22c55e33",
        black: "#0a0a0a",
        red: "#ef4444",
        green: "#22c55e",
        yellow: "#eab308",
        blue: "#3b82f6",
        magenta: "#a855f7",
        cyan: "#06b6d4",
        white: "#f5f5f5",
        brightBlack: "#525252",
        brightRed: "#f87171",
        brightGreen: "#4ade80",
        brightYellow: "#facc15",
        brightBlue: "#60a5fa",
        brightMagenta: "#c084fc",
        brightCyan: "#22d3ee",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    const handleResize = () => {
      if (fitAddonRef.current && taskId) {
        fitAddonRef.current.fit();
        if (termRef.current) {
          ptyManager.resize(taskId, termRef.current.cols, termRef.current.rows);
        }
      }
    };
    window.addEventListener("resize", handleResize);

    connectToPty();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [taskId, connectToPty]);

  useEffect(() => {
    if (!taskId) return;

    // taskId 變化時重新初始化
    if (currentTaskIdRef.current !== taskId) {
      currentTaskIdRef.current = taskId;

      const timer = setTimeout(() => {
        initTerminal();
        setTimeout(() => {
          fitAddonRef.current?.fit();
        }, 100);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [taskId, initTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (termRef.current) {
        termRef.current.dispose();
      }
    };
  }, []);

  const handleNewSession = () => {
    if (termRef.current && taskId) {
      termRef.current.clear();
      ptyManager.restart(taskId, { workingDir });
      termRef.current.writeln("\x1b[33m[Starting new Claude Code session...]\x1b[0m");

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      unsubscribeRef.current = ptyManager.subscribe(taskId, (data) => {
        termRef.current?.write(data);
      });
    }
  };

  const handleReconnect = () => {
    if (termRef.current && taskId) {
      termRef.current.clear();
      connectToPty();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-green-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-green-600" />
          <span className="text-green-500 text-sm font-mono">claude</span>
          {ptyManager.has(taskId) && (
            <span className="text-xs text-green-700">[running]</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewSession}
            className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReconnect}
            className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
            title="Reconnect"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1 p-2 overflow-hidden">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
