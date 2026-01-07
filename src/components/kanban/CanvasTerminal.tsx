import { useEffect, useRef, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { Button } from "@/components/ui/button";
import {
  GitCommit,
  FileSearch,
  Bug,
  Sparkles,
} from "lucide-react";

interface TermCell {
  c: string;
  fg: [number, number, number];
  bg: [number, number, number];
  bold: boolean;
  italic: boolean;
  underline: boolean;
  wide: boolean;
  spacer: boolean;
}

interface TerminalGrid {
  id: string;
  cols: number;
  rows: number;
  cells: TermCell[][];
  cursor_x: number;
  cursor_y: number;
  cursor_visible: boolean;
}

interface CanvasTerminalProps {
  taskId: string;
  workingDir?: string;
}

// 字體設定 - 使用整數避免 resize 抖動
const FONT_SIZE = 14;
const FONT_FAMILY = '"SF Mono", Menlo, Monaco, "PingFang TC", monospace';
const CELL_WIDTH = 9; // 整數，避免浮點誤差
const CELL_HEIGHT = 17;

export function CanvasTerminal({ taskId, workingDir }: CanvasTerminalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const isComposingRef = useRef(false);
  const gridRef = useRef<TerminalGrid | null>(null);
  const hasRenderedRef = useRef(false);

  // 計算終端尺寸
  const calculateSize = useCallback(() => {
    if (!containerRef.current) return { cols: 80, rows: 24 };
    const rect = containerRef.current.getBoundingClientRect();
    const cols = Math.floor(rect.width / CELL_WIDTH);
    const rows = Math.floor(rect.height / CELL_HEIGHT);
    return { cols: Math.max(cols, 20), rows: Math.max(rows, 5) };
  }, []);

  // 渲染終端到 Canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const currentGrid = gridRef.current;
    if (!canvas || !container || !currentGrid) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const { cols, rows, cells, cursor_x, cursor_y, cursor_visible } = currentGrid;

    // Canvas 大小根據 container，不是 grid
    const containerRect = container.getBoundingClientRect();
    const width = Math.floor(containerRect.width);
    const height = Math.floor(containerRect.height);
    const targetWidth = width * dpr;
    const targetHeight = height * dpr;

    const needsResize = canvas.width !== targetWidth || canvas.height !== targetHeight;
    if (needsResize) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Reset transform and scale
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 清除背景
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    // 設定字體
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = "top";

    // 繪製每個 cell
    for (let row = 0; row < rows && row < cells.length; row++) {
      for (let col = 0; col < cols && col < cells[row].length; col++) {
        const cell = cells[row][col];

        // Skip spacer cells (second half of wide chars)
        if (cell.spacer) continue;

        const x = col * CELL_WIDTH;
        const y = row * CELL_HEIGHT;
        const cellWidth = cell.wide ? CELL_WIDTH * 2 : CELL_WIDTH;

        // 背景
        const bgColor = `rgb(${cell.bg[0]}, ${cell.bg[1]}, ${cell.bg[2]})`;
        if (bgColor !== "rgb(10, 10, 10)") {
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, cellWidth, CELL_HEIGHT);
        }

        // 文字
        if (cell.c && cell.c !== " ") {
          const fgColor = `rgb(${cell.fg[0]}, ${cell.fg[1]}, ${cell.fg[2]})`;
          ctx.fillStyle = fgColor;

          // Bold
          if (cell.bold) {
            ctx.font = `bold ${FONT_SIZE}px ${FONT_FAMILY}`;
          } else if (cell.italic) {
            ctx.font = `italic ${FONT_SIZE}px ${FONT_FAMILY}`;
          } else {
            ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
          }

          ctx.fillText(cell.c, x, y + 2);

          // Underline
          if (cell.underline) {
            ctx.strokeStyle = fgColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + CELL_HEIGHT - 2);
            ctx.lineTo(x + cellWidth, y + CELL_HEIGHT - 2);
            ctx.stroke();
          }
        }
      }
    }

    // 游標
    if (cursor_visible && cursor_y < rows && cursor_x < cols) {
      const cursorX = cursor_x * CELL_WIDTH;
      const cursorY = cursor_y * CELL_HEIGHT;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(cursorX, cursorY, CELL_WIDTH, CELL_HEIGHT);

      // 反轉游標位置的文字顏色
      if (cells[cursor_y] && cells[cursor_y][cursor_x]) {
        const cell = cells[cursor_y][cursor_x];
        if (cell.c && cell.c !== " ") {
          ctx.fillStyle = "#0a0a0a";
          ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
          ctx.fillText(cell.c, cursorX, cursorY + 2);
        }
      }
    }
  }, []);

  // 初始化終端
  useEffect(() => {
    if (!taskId) return;

    const { cols, rows } = calculateSize();
    let unlistenRender: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;

    const init = async () => {
      try {
        // 監聯渲染事件
        unlistenRender = await listen<TerminalGrid>(
          `terminal-render-${taskId}`,
          (event) => {
            gridRef.current = event.payload;
            if (!hasRenderedRef.current) {
              hasRenderedRef.current = true;
              setIsRunning(true);
            }
            requestAnimationFrame(render);
          }
        );

        // 監聽退出事件
        unlistenExit = await listen(`terminal-exit-${taskId}`, () => {
          setIsRunning(false);
        });

        // 創建終端
        await invoke("terminal_create", {
          id: taskId,
          cols,
          rows,
          cwd: workingDir,
        });
        // isRunning will be set when first render event is received
      } catch (e) {
        console.error("Failed to create terminal:", e);
      }
    };

    init();

    // Auto focus the hidden input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      unlistenRender?.();
      unlistenExit?.();
      hasRenderedRef.current = false;
      setIsRunning(false);
      // Don't kill terminal on unmount - keep session alive for reconnection
      // Terminal is only killed when task is deleted (handled in Board.tsx)
    };
  }, [taskId, workingDir, calculateSize, render]);

  // 處理鍵盤輸入
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't handle if composing (IME)
      if (isComposingRef.current) return;

      let data: number[] = [];
      let handled = false;

      // Special keys
      switch (e.key) {
        case "Enter":
          data = [13];
          handled = true;
          break;
        case "Backspace":
          data = [127];
          handled = true;
          break;
        case "Tab":
          data = [9];
          handled = true;
          break;
        case "Escape":
          data = [27];
          handled = true;
          break;
        case "ArrowUp":
          data = [27, 91, 65];
          handled = true;
          break;
        case "ArrowDown":
          data = [27, 91, 66];
          handled = true;
          break;
        case "ArrowRight":
          data = [27, 91, 67];
          handled = true;
          break;
        case "ArrowLeft":
          data = [27, 91, 68];
          handled = true;
          break;
        case "Home":
          data = [27, 91, 72];
          handled = true;
          break;
        case "End":
          data = [27, 91, 70];
          handled = true;
          break;
        case "PageUp":
          data = [27, 91, 53, 126];
          handled = true;
          break;
        case "PageDown":
          data = [27, 91, 54, 126];
          handled = true;
          break;
        case "Delete":
          data = [27, 91, 51, 126];
          handled = true;
          break;
      }

      // Ctrl combinations
      if (e.ctrlKey && e.key.length === 1) {
        const code = e.key.toLowerCase().charCodeAt(0) - 96;
        if (code > 0 && code < 27) {
          data = [code];
          handled = true;
        }
      }

      if (handled) {
        e.preventDefault();
        if (data.length > 0) {
          try {
            await invoke("terminal_write", { id: taskId, data });
          } catch (err) {
            console.error("Failed to write to terminal:", err);
          }
        }
      }
    },
    [taskId]
  );

  // 處理文字輸入 (包括 IME)
  const handleInput = useCallback(
    async (e: React.FormEvent<HTMLTextAreaElement>) => {
      const target = e.target as HTMLTextAreaElement;
      const value = target.value;
      if (value && !isComposingRef.current) {
        const data = Array.from(new TextEncoder().encode(value));
        try {
          await invoke("terminal_write", { id: taskId, data });
        } catch (err) {
          console.error("Failed to write to terminal:", err);
        }
        target.value = ""; // Clear after sending
      }
    },
    [taskId]
  );

  // IME composition handlers
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    async (e: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposingRef.current = false;
      const target = e.target as HTMLTextAreaElement;
      const value = target.value;
      if (value) {
        const data = Array.from(new TextEncoder().encode(value));
        try {
          await invoke("terminal_write", { id: taskId, data });
        } catch (err) {
          console.error("Failed to write to terminal:", err);
        }
        target.value = ""; // Clear after sending
      }
    },
    [taskId]
  );

  // 滾輪滾動處理
  const handleWheel = useCallback(
    async (e: React.WheelEvent) => {
      e.preventDefault();
      // deltaY > 0 表示向下滾動，需要往回看歷史（負數）
      // deltaY < 0 表示向上滾動，需要往前看（正數）
      const lines = Math.sign(e.deltaY) * -3; // 每次滾動 3 行
      try {
        await invoke("terminal_scroll", { id: taskId, lines });
      } catch (err) {
        console.error("Failed to scroll terminal:", err);
      }
    },
    [taskId]
  );

  // Resize 處理 - debounced，只在穩定後才 resize
  const lastSizeRef = useRef({ cols: 0, rows: 0 });

  useEffect(() => {
    if (!containerRef.current || !isRunning) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const { cols, rows } = calculateSize();
        const last = lastSizeRef.current;
        // Only resize if dimensions changed by more than 2 cells (avoid jitter)
        if (Math.abs(cols - last.cols) > 2 || Math.abs(rows - last.rows) > 2) {
          lastSizeRef.current = { cols, rows };
          invoke("terminal_resize", { id: taskId, cols, rows }).catch(console.error);
        }
      }, 200); // Longer debounce
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Initial size
    const { cols, rows } = calculateSize();
    lastSizeRef.current = { cols, rows };

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [taskId, isRunning, calculateSize]);

  // 快捷指令
  const quickCommands = [
    { icon: GitCommit, label: "commit", command: "/commit\n" },
    { icon: FileSearch, label: "review", command: "review the changes I made\n" },
    { icon: Bug, label: "fix", command: "fix the errors\n" },
    { icon: Sparkles, label: "improve", command: "improve this code\n" },
  ];

  const handleQuickCommand = async (command: string) => {
    const data = Array.from(new TextEncoder().encode(command));
    try {
      await invoke("terminal_write", { id: taskId, data });
    } catch (e) {
      console.error("Failed to send command:", e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]" style={{ minHeight: "400px" }}>
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

      {/* Terminal Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden focus:outline-none relative"
        onClick={() => inputRef.current?.focus()}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ imageRendering: "pixelated" }}
        />
        {/* Loading overlay */}
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
            <div className="text-green-600 font-mono text-sm flex items-center gap-2">
              <span className="animate-pulse">●</span>
              <span>initializing claude...</span>
            </div>
          </div>
        )}
        {/* Hidden textarea for keyboard input (including IME) */}
        <textarea
          ref={inputRef}
          className="absolute opacity-0 pointer-events-none"
          style={{
            width: 1,
            height: 1,
            top: 0,
            left: 0,
            resize: "none",
            border: "none",
            outline: "none",
            padding: 0,
            caretColor: "transparent",
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
      </div>
    </div>
  );
}
