import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type CellPos,
  extractBlockText,
  normalizeRect,
  pixelToCell,
} from '@/lib/canvas-selection-utils';

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
  is_alt_screen?: boolean;
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
  const selectionStartRef = useRef<CellPos | null>(null);
  const selectionEndRef = useRef<CellPos | null>(null);
  const isSelectingRef = useRef(false);
  const isAltHeldRef = useRef(false);
  const pointerButtonRef = useRef(0);
  const mouseInputUnavailableRef = useRef(false);
  const [hasSelection, setHasSelection] = useState(false);

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

    const ctx = canvas.getContext('2d');
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
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // 設定字體
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';

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
        if (bgColor !== 'rgb(10, 10, 10)') {
          ctx.fillStyle = bgColor;
          ctx.fillRect(x, y, cellWidth, CELL_HEIGHT);
        }

        // 文字
        if (cell.c && cell.c !== ' ') {
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
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cursorX, cursorY, CELL_WIDTH, CELL_HEIGHT);

      // 反轉游標位置的文字顏色
      if (cells[cursor_y] && cells[cursor_y][cursor_x]) {
        const cell = cells[cursor_y][cursor_x];
        if (cell.c && cell.c !== ' ') {
          ctx.fillStyle = '#0a0a0a';
          ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
          ctx.fillText(cell.c, cursorX, cursorY + 2);
        }
      }
    }

    const selectionStart = selectionStartRef.current;
    const selectionEnd = selectionEndRef.current;
    if (selectionStart && selectionEnd) {
      const rect = normalizeRect(selectionStart, selectionEnd);
      const startRow = Math.max(0, rect.startRow);
      const endRow = Math.min(rows - 1, rect.endRow);
      const startCol = Math.max(0, rect.startCol);
      const endCol = Math.min(cols - 1, rect.endCol);

      if (startRow <= endRow && startCol <= endCol) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        for (let row = startRow; row <= endRow; row++) {
          const x = startCol * CELL_WIDTH;
          const y = row * CELL_HEIGHT;
          const width = (endCol - startCol + 1) * CELL_WIDTH;
          ctx.fillRect(x, y, width, CELL_HEIGHT);
        }
      }
    }
  }, []);

  const getCellFromPointerEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): CellPos | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rawCell = pixelToCell(x, y);

      const currentGrid = gridRef.current;
      const fallbackSize = calculateSize();
      const maxCol = Math.max((currentGrid?.cols ?? fallbackSize.cols) - 1, 0);
      const maxRow = Math.max((currentGrid?.rows ?? fallbackSize.rows) - 1, 0);

      return {
        col: Math.min(Math.max(rawCell.col, 0), maxCol),
        row: Math.min(Math.max(rawCell.row, 0), maxRow),
      };
    },
    [calculateSize]
  );

  const clearSelection = useCallback(() => {
    selectionStartRef.current = null;
    selectionEndRef.current = null;
    isSelectingRef.current = false;
    setHasSelection(false);
    requestAnimationFrame(render);
  }, [render]);

  const getSelectedText = useCallback((): string => {
    const currentGrid = gridRef.current;
    const start = selectionStartRef.current;
    const end = selectionEndRef.current;
    if (!currentGrid || !start || !end) return '';

    const rect = normalizeRect(start, end);
    const clampedRect = {
      startRow: Math.max(0, rect.startRow),
      endRow: Math.min(currentGrid.rows - 1, rect.endRow),
      startCol: Math.max(0, rect.startCol),
      endCol: Math.min(currentGrid.cols - 1, rect.endCol),
    };

    if (clampedRect.startRow > clampedRect.endRow || clampedRect.startCol > clampedRect.endCol) {
      return '';
    }

    return extractBlockText(currentGrid.cells, clampedRect);
  }, []);

  const handleCopySelection = useCallback(async () => {
    const selected = getSelectedText();
    if (!selected) return;

    try {
      await navigator.clipboard.writeText(selected);
    } catch (err) {
      console.error('Failed to copy selection:', err);
    }
  }, [getSelectedText]);

  type MouseEventType = 'down' | 'move' | 'up';

  const sendTerminalMouseInput = useCallback(
    async (eventType: MouseEventType, cell: CellPos, button: number) => {
      if (mouseInputUnavailableRef.current) return;

      try {
        await invoke('terminal_mouse_input', {
          id: taskId,
          eventType,
          event_type: eventType,
          kind: eventType,
          col: cell.col,
          row: cell.row,
          button,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('terminal_mouse_input')) {
          mouseInputUnavailableRef.current = true;
          return;
        }
        console.error('Failed to send terminal mouse input:', err);
      }
    },
    [taskId]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      inputRef.current?.focus();
      isAltHeldRef.current = e.altKey;
      pointerButtonRef.current = e.button;

      const cell = getCellFromPointerEvent(e);
      if (!cell) return;

      e.currentTarget.setPointerCapture(e.pointerId);

      if (e.altKey) {
        e.preventDefault();
        selectionStartRef.current = cell;
        selectionEndRef.current = cell;
        isSelectingRef.current = true;
        setHasSelection(true);
        requestAnimationFrame(render);
        return;
      }

      if (hasSelection) {
        clearSelection();
      }

      if (gridRef.current?.is_alt_screen) {
        void sendTerminalMouseInput('down', cell, e.button);
      }
    },
    [clearSelection, getCellFromPointerEvent, hasSelection, render, sendTerminalMouseInput]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isAltHeldRef.current = e.altKey;
      const cell = getCellFromPointerEvent(e);
      if (!cell) return;

      if (isSelectingRef.current) {
        e.preventDefault();
        selectionEndRef.current = cell;
        requestAnimationFrame(render);
        return;
      }

      if (gridRef.current?.is_alt_screen && e.buttons !== 0) {
        void sendTerminalMouseInput('move', cell, pointerButtonRef.current);
      }
    },
    [getCellFromPointerEvent, render, sendTerminalMouseInput]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      isAltHeldRef.current = e.altKey;
      const cell = getCellFromPointerEvent(e);

      if (isSelectingRef.current) {
        e.preventDefault();
        if (cell) {
          selectionEndRef.current = cell;
        }
        isSelectingRef.current = false;
        setHasSelection(Boolean(selectionStartRef.current && selectionEndRef.current));
        requestAnimationFrame(render);
      } else if (cell && gridRef.current?.is_alt_screen) {
        void sendTerminalMouseInput('up', cell, pointerButtonRef.current);
      }

      pointerButtonRef.current = 0;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [getCellFromPointerEvent, render, sendTerminalMouseInput]
  );

  const handlePointerCancel = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    isSelectingRef.current = false;
    isAltHeldRef.current = false;
    pointerButtonRef.current = 0;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
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
        unlistenRender = await listen<TerminalGrid>(`terminal-render-${taskId}`, (event) => {
          gridRef.current = event.payload;
          if (!hasRenderedRef.current) {
            hasRenderedRef.current = true;
            setIsRunning(true);
          }
          requestAnimationFrame(render);
        });

        // 監聽退出事件
        unlistenExit = await listen(`terminal-exit-${taskId}`, () => {
          setIsRunning(false);
        });

        // 創建終端
        await invoke('terminal_create', {
          id: taskId,
          cols,
          rows,
          cwd: workingDir,
        });
        // isRunning will be set when first render event is received
      } catch (e) {
        console.error('Failed to create terminal:', e);
      }
    };

    init();

    // Auto focus the hidden input
    const focusTimeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => {
      clearTimeout(focusTimeout);
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
        case 'Enter':
          data = [13];
          handled = true;
          break;
        case 'Backspace':
          data = [127];
          handled = true;
          break;
        case 'Tab':
          data = [9];
          handled = true;
          break;
        case 'Escape':
          data = [27];
          handled = true;
          break;
        case 'ArrowUp':
          data = [27, 91, 65];
          handled = true;
          break;
        case 'ArrowDown':
          data = [27, 91, 66];
          handled = true;
          break;
        case 'ArrowRight':
          data = [27, 91, 67];
          handled = true;
          break;
        case 'ArrowLeft':
          data = [27, 91, 68];
          handled = true;
          break;
        case 'Home':
          data = [27, 91, 72];
          handled = true;
          break;
        case 'End':
          data = [27, 91, 70];
          handled = true;
          break;
        case 'PageUp':
          data = [27, 91, 53, 126];
          handled = true;
          break;
        case 'PageDown':
          data = [27, 91, 54, 126];
          handled = true;
          break;
        case 'Delete':
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
            await invoke('terminal_write', { id: taskId, data });
          } catch (err) {
            console.error('Failed to write to terminal:', err);
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
          await invoke('terminal_write', { id: taskId, data });
        } catch (err) {
          console.error('Failed to write to terminal:', err);
        }
        target.value = ''; // Clear after sending
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
          await invoke('terminal_write', { id: taskId, data });
        } catch (err) {
          console.error('Failed to write to terminal:', err);
        }
        target.value = ''; // Clear after sending
      }
    },
    [taskId]
  );

  // 滾輪滾動處理
  const handleWheel = useCallback(
    async (e: React.WheelEvent) => {
      e.preventDefault();
      if (isSelectingRef.current || e.altKey || isAltHeldRef.current) {
        return;
      }

      // deltaY > 0 表示向下滾動，需要往回看歷史（負數）
      // deltaY < 0 表示向上滾動，需要往前看（正數）
      const lines = Math.sign(e.deltaY) * -3; // 每次滾動 3 行
      try {
        await invoke('terminal_scroll', { id: taskId, lines });
      } catch (err) {
        console.error('Failed to scroll terminal:', err);
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
          invoke('terminal_resize', { id: taskId, cols, rows }).catch(console.error);
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

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden focus:outline-none relative"
        onClick={() => inputRef.current?.focus()}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-text"
          style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        />
        {hasSelection && (
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded border border-[#22c55e] bg-[#0a0a0a] px-2 py-1 font-mono text-xs text-[#22c55e] hover:bg-[#0f1f0f]"
            onClick={() => {
              void handleCopySelection();
            }}
          >
            Copy Selection
          </button>
        )}
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]">
            <div
              className="text-[#00FF00] font-mono text-sm flex items-center gap-2"
              style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}
            >
              <span className="animate-pulse">●</span>
              <span>initializing...</span>
            </div>
          </div>
        )}
        <textarea
          ref={inputRef}
          className="absolute opacity-0 pointer-events-none"
          style={{
            width: 1,
            height: 1,
            top: 0,
            left: 0,
            resize: 'none',
            border: 'none',
            outline: 'none',
            padding: 0,
            caretColor: 'transparent',
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
