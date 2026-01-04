import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { spawn, IPty } from "tauri-pty";
import "@xterm/xterm/css/xterm.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Terminal as TerminalIcon, X, RotateCcw } from "lucide-react";

interface ClaudeTerminalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workingDir?: string;
}

export function ClaudeTerminal({
  open,
  onOpenChange,
  workingDir,
}: ClaudeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const ptyRef = useRef<IPty | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const initTerminal = useCallback(() => {
    if (!terminalRef.current || termRef.current) return;

    // 創建 xterm 實例
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

    // 啟動 Claude Code
    startClaude(term);

    // 監聽視窗大小變化
    const handleResize = () => {
      if (fitAddonRef.current && ptyRef.current) {
        fitAddonRef.current.fit();
        ptyRef.current.resize(term.cols, term.rows);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [workingDir]);

  const startClaude = useCallback(
    (term: Terminal) => {
      // 清理舊的 PTY
      if (ptyRef.current) {
        ptyRef.current.kill();
        ptyRef.current = null;
      }

      try {
        console.log("[ClaudeTerminal] Starting claude...", { cols: term.cols, rows: term.rows });
        term.writeln("\x1b[33m[Starting Claude Code...]\x1b[0m");

        // 用 shell 啟動 claude，確保 PATH 正確
        const shell = "/bin/zsh";
        const pty = spawn(shell, ["-l", "-c", "claude"], {
          cols: term.cols,
          rows: term.rows,
          cwd: workingDir || undefined,
          env: {
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
          },
        });

        console.log("[ClaudeTerminal] PTY spawned, pid:", pty.pid);
        ptyRef.current = pty;

        // PTY 輸出 → xterm
        pty.onData((data: unknown) => {
          console.log("[PTY data]", typeof data, data);
          try {
            if (typeof data === "string") {
              term.write(data);
            } else if (data instanceof Uint8Array) {
              term.write(new TextDecoder().decode(data));
            } else if (Array.isArray(data)) {
              // 可能是數字陣列
              term.write(new TextDecoder().decode(new Uint8Array(data)));
            } else {
              // fallback: 嘗試轉字串
              term.write(String(data));
            }
          } catch (e) {
            console.error("[PTY decode error]", e);
          }
        });

        // xterm 輸入 → PTY
        term.onData((data: string) => {
          pty.write(data);
        });

        // PTY 退出
        pty.onExit(({ exitCode }) => {
          term.writeln("");
          term.writeln(
            `\x1b[90m[Process exited with code ${exitCode}]\x1b[0m`
          );
          term.writeln("\x1b[90m[Press any key to restart Claude]\x1b[0m");

          // 等待按鍵重啟
          const disposable = term.onData(() => {
            disposable.dispose();
            term.clear();
            startClaude(term);
          });
        });
      } catch (error) {
        term.writeln(`\x1b[31m[Error] Failed to start Claude: ${error}\x1b[0m`);
        term.writeln("\x1b[90mMake sure Claude CLI is installed: npm install -g @anthropic-ai/claude-code\x1b[0m");
      }
    },
    [workingDir]
  );

  // 當 drawer 打開時初始化終端
  useEffect(() => {
    if (open) {
      // 延遲初始化以確保 DOM 已渲染
      const timer = setTimeout(() => {
        initTerminal();
        // 再次 fit 確保尺寸正確
        setTimeout(() => {
          fitAddonRef.current?.fit();
        }, 100);
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // 關閉時清理
      if (ptyRef.current) {
        ptyRef.current.kill();
        ptyRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      fitAddonRef.current = null;
    }
  }, [open, initTerminal]);

  const handleRestart = () => {
    if (termRef.current) {
      termRef.current.clear();
      startClaude(termRef.current);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlay={false}
        className="w-[600px] sm:max-w-[600px] bg-[#0a0a0a] border-l border-green-900 p-0"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-green-900 px-4 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-green-600" />
              <SheetTitle className="text-green-500 text-sm font-mono">
                claude
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRestart}
                className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
                title="Restart Claude"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Terminal Container */}
          <div className="flex-1 p-2 overflow-hidden">
            <div ref={terminalRef} className="h-full w-full" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
