import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawn, IPty } from "tauri-pty";
import { invoke } from "@tauri-apps/api/core";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, Plus, FolderOpen, GitCommit, FileSearch, Bug, Sparkles } from "lucide-react";

interface ClaudeTerminalProps {
  taskId: string;
  workingDir?: string;
}

// PTY 緩存結構 - 保持 PTY 進程和 output buffer
interface PtySession {
  pty: IPty;
  outputBuffer: string[];
  listeners: Set<(data: string) => void>;
}

const ptyCache = new Map<string, PtySession>();

// 關閉指定 taskId 的 PTY
export function killPty(taskId: string): void {
  const session = ptyCache.get(taskId);
  if (session) {
    session.pty.kill();
    ptyCache.delete(taskId);
  }
}

// 向指定 taskId 的 PTY 寫入指令
export function writeToPty(taskId: string, data: string): boolean {
  const session = ptyCache.get(taskId);
  if (session) {
    session.pty.write(data);
    return true;
  }
  return false;
}

// 向指定 taskId 的 PTY 發送指令（自動加換行）
export function sendCommand(taskId: string, command: string): boolean {
  return writeToPty(taskId, command + "\n");
}

export function ClaudeTerminal({ taskId, workingDir }: ClaudeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyRef = useRef<IPty | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!terminalRef.current || !taskId) return;

    // 創建 xterm.js 終端
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

    // 取得或創建 PTY session
    let session = ptyCache.get(taskId);
    if (!session) {
      const pty = spawn("/bin/zsh", ["-l", "-c", "claude"], {
        cols: term.cols,
        rows: term.rows,
        cwd: workingDir || undefined,
        env: {
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      session = {
        pty,
        outputBuffer: [],
        listeners: new Set(),
      };
      ptyCache.set(taskId, session);

      // PTY data handler - 廣播給所有 listeners 並存入 buffer
      pty.onData((data: unknown) => {
        let str: string;
        if (typeof data === "string") {
          str = data;
        } else if (data instanceof Uint8Array) {
          str = new TextDecoder().decode(data);
        } else if (Array.isArray(data)) {
          str = new TextDecoder().decode(new Uint8Array(data));
        } else {
          return;
        }
        // 存入 buffer（限制大小避免記憶體爆炸）
        session!.outputBuffer.push(str);
        if (session!.outputBuffer.length > 10000) {
          session!.outputBuffer.shift();
        }
        // 廣播給所有 listeners
        session!.listeners.forEach((listener) => listener(str));
      });

      // PTY 退出時清理
      pty.onExit(({ exitCode }) => {
        console.log("[ClaudeTerminal] PTY exited:", exitCode);
        const s = ptyCache.get(taskId);
        if (s) {
          s.listeners.forEach((listener) =>
            listener(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`)
          );
        }
        ptyCache.delete(taskId);
        setIsRunning(false);
      });
    } else {
      // 恢復歷史 output
      session.outputBuffer.forEach((chunk) => term.write(chunk));
    }

    ptyRef.current = session.pty;
    setIsRunning(true);

    // 註冊 listener
    const listener = (data: string) => term.write(data);
    session.listeners.add(listener);

    // 輸入處理
    const inputDisposable = term.onData((data) => {
      session?.pty.write(data);
    });

    // Resize 處理 - 使用 debounce 和尺寸檢查避免閃爍
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastCols = term.cols;
    let lastRows = term.rows;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          fitAddon.fit();
          // 只有尺寸真的變了才通知 PTY
          if (term.cols !== lastCols || term.rows !== lastRows) {
            lastCols = term.cols;
            lastRows = term.rows;
            session?.pty.resize(term.cols, term.rows);
          }
        });
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    // Cleanup - 只移除 listener，不 kill PTY
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      session?.listeners.delete(listener);
      inputDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [taskId, workingDir]);

  const handleNewSession = () => {
    // 殺掉舊 PTY session
    const oldSession = ptyCache.get(taskId);
    if (oldSession) {
      oldSession.pty.kill();
      ptyCache.delete(taskId);
    }

    // 清除終端並創建新 PTY
    if (termRef.current) {
      termRef.current.clear();
      const term = termRef.current;

      const pty = spawn("/bin/zsh", ["-l", "-c", "claude"], {
        cols: term.cols,
        rows: term.rows,
        cwd: workingDir || undefined,
        env: {
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      const session: PtySession = {
        pty,
        outputBuffer: [],
        listeners: new Set(),
      };

      // 註冊當前 terminal 的 listener
      const listener = (data: string) => term.write(data);
      session.listeners.add(listener);

      ptyCache.set(taskId, session);
      ptyRef.current = pty;
      setIsRunning(true);

      pty.onData((data: unknown) => {
        let str: string;
        if (typeof data === "string") {
          str = data;
        } else if (data instanceof Uint8Array) {
          str = new TextDecoder().decode(data);
        } else if (Array.isArray(data)) {
          str = new TextDecoder().decode(new Uint8Array(data));
        } else {
          return;
        }
        session.outputBuffer.push(str);
        if (session.outputBuffer.length > 10000) {
          session.outputBuffer.shift();
        }
        session.listeners.forEach((l) => l(str));
      });

      pty.onExit(({ exitCode }) => {
        const s = ptyCache.get(taskId);
        if (s) {
          s.listeners.forEach((l) =>
            l(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`)
          );
        }
        ptyCache.delete(taskId);
        setIsRunning(false);
      });
    }
  };

  const handleOpenInFinder = async () => {
    if (workingDir) {
      try {
        await invoke("open_folder", { path: workingDir });
      } catch (e) {
        console.error("Failed to open in Finder:", e);
      }
    }
  };

  // 快捷指令
  const quickCommands = [
    { icon: GitCommit, label: "commit", command: "/commit" },
    { icon: FileSearch, label: "review", command: "review the changes I made" },
    { icon: Bug, label: "fix", command: "fix the errors" },
    { icon: Sparkles, label: "improve", command: "improve this code" },
  ];

  const handleQuickCommand = (command: string) => {
    const session = ptyCache.get(taskId);
    if (session) {
      session.pty.write(command + "\n");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]" style={{ minHeight: '400px' }}>
      {/* Header */}
      <div className="border-b border-green-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-4 w-4 text-green-600" />
          <span className="text-green-500 text-sm font-mono">claude</span>
          {isRunning && (
            <span className="text-xs text-green-700">[running]</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {workingDir && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenInFinder}
              className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
              title="Open in Finder"
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewSession}
            className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
            title="New Session"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="border-b border-green-900/50 px-4 py-2 flex items-center gap-2">
        {quickCommands.map((cmd) => (
          <Button
            key={cmd.label}
            variant="ghost"
            size="sm"
            onClick={() => handleQuickCommand(cmd.command)}
            className="text-green-700 hover:text-green-400 hover:bg-green-900/30 h-7 px-2 font-mono text-xs"
          >
            <cmd.icon className="h-3 w-3 mr-1" />
            {cmd.label}
          </Button>
        ))}
      </div>

      {/* Terminal */}
      <div className="flex-1 p-2 overflow-hidden">
        <div ref={terminalRef} className="h-full w-full" />
      </div>
    </div>
  );
}
