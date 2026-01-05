import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawn, IPty } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, RotateCcw, Plus } from "lucide-react";

interface ClaudeTerminalProps {
  taskId: string;
  workingDir?: string;
}

// 全局 PTY 緩存 - 保持 PTY 進程在組件重新渲染時存活
const ptyCache = new Map<string, IPty>();

// 關閉指定 taskId 的 PTY
export function killPty(taskId: string): void {
  const pty = ptyCache.get(taskId);
  if (pty) {
    pty.kill();
    ptyCache.delete(taskId);
  }
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

    // 取得或創建 PTY
    let pty = ptyCache.get(taskId);
    if (!pty) {
      pty = spawn("/bin/zsh", ["-l", "-c", "claude"], {
        cols: term.cols,
        rows: term.rows,
        cwd: workingDir || undefined,
        env: {
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });
      ptyCache.set(taskId, pty);

      // PTY 退出時清理
      pty.onExit(({ exitCode }) => {
        console.log("[ClaudeTerminal] PTY exited:", exitCode);
        ptyCache.delete(taskId);
        setIsRunning(false);
        term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      });
    }

    ptyRef.current = pty;
    setIsRunning(true);

    // 最原生的連接方式 - 直接雙向綁定
    const dataDisposable = pty.onData((data: unknown) => {
      // 處理不同的數據類型
      if (typeof data === "string") {
        term.write(data);
      } else if (data instanceof Uint8Array) {
        term.write(data);
      } else if (Array.isArray(data)) {
        term.write(new Uint8Array(data));
      }
    });

    const inputDisposable = term.onData((data) => {
      pty!.write(data);
    });

    // Resize 處理
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        fitAddon.fit();
        pty?.resize(term.cols, term.rows);
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
      dataDisposable.dispose();
      inputDisposable.dispose();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
  }, [taskId, workingDir]);

  const handleNewSession = () => {
    // 殺掉舊 PTY
    const oldPty = ptyCache.get(taskId);
    if (oldPty) {
      oldPty.kill();
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

      ptyCache.set(taskId, pty);
      ptyRef.current = pty;
      setIsRunning(true);

      pty.onData((data: unknown) => {
        if (typeof data === "string") {
          term.write(data);
        } else if (data instanceof Uint8Array) {
          term.write(data);
        } else if (Array.isArray(data)) {
          term.write(new Uint8Array(data));
        }
      });
      pty.onExit(({ exitCode }) => {
        ptyCache.delete(taskId);
        setIsRunning(false);
        term.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      });
    }
  };

  const handleReconnect = () => {
    // 重新 fit 並同步尺寸
    if (fitAddonRef.current && termRef.current && ptyRef.current) {
      fitAddonRef.current.fit();
      ptyRef.current.resize(termRef.current.cols, termRef.current.rows);
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
