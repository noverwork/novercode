import { invoke } from '@tauri-apps/api/core';
import { Plus, Terminal, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CanvasTerminal } from './canvas-terminal';

interface TerminalInfo {
  id: string;
  name: string;
}

interface TaskTerminalState {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
}

interface TerminalPanelProps {
  taskId: string;
  workingDir?: string;
  isTaskReady: boolean;
}

const EMPTY_STATE: TaskTerminalState = {
  terminals: [],
  activeTerminalId: null,
};

export function TerminalPanel({ taskId, workingDir, isTaskReady }: TerminalPanelProps) {
  const [taskTerminals, setTaskTerminals] = useState<Record<string, TaskTerminalState>>({});
  const currentState = taskTerminals[taskId] ?? EMPTY_STATE;
  const terminals = currentState.terminals;
  const activeTerminalId = currentState.activeTerminalId;
  const hasTerminals = terminals.length > 0;

  useEffect(() => {
    if (!isTaskReady || hasTerminals) {
      return;
    }

    const timer = window.setTimeout(() => {
      setTaskTerminals((prev) => {
        const existing = prev[taskId];
        if (existing && existing.terminals.length > 0) {
          return prev;
        }

        const initialId = crypto.randomUUID();
        return {
          ...prev,
          [taskId]: {
            terminals: [{ id: initialId, name: 'Terminal 1' }],
            activeTerminalId: initialId,
          },
        };
      });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasTerminals, isTaskReady, taskId]);

  const setActiveTerminal = useCallback(
    (terminalId: string) => {
      setTaskTerminals((prev) => {
        const current = prev[taskId] ?? EMPTY_STATE;
        return {
          ...prev,
          [taskId]: {
            terminals: current.terminals,
            activeTerminalId: terminalId,
          },
        };
      });
    },
    [taskId]
  );

  const handleAddTerminal = useCallback(() => {
    setTaskTerminals((prev) => {
      const current = prev[taskId] ?? EMPTY_STATE;
      const newId = crypto.randomUUID();
      const newName = `Terminal ${current.terminals.length + 1}`;
      return {
        ...prev,
        [taskId]: {
          terminals: [...current.terminals, { id: newId, name: newName }],
          activeTerminalId: newId,
        },
      };
    });
  }, [taskId]);

  const handleCloseTerminal = useCallback(
    (id: string) => {
      invoke('terminal_kill', { id }).catch(console.error);

      setTaskTerminals((prev) => {
        const current = prev[taskId] ?? EMPTY_STATE;
        const remaining = current.terminals.filter((t) => t.id !== id);
        const nextActiveTerminalId =
          current.activeTerminalId === id ? (remaining[0]?.id ?? null) : current.activeTerminalId;

        return {
          ...prev,
          [taskId]: {
            terminals: remaining,
            activeTerminalId: nextActiveTerminalId,
          },
        };
      });
    },
    [taskId]
  );

  const activeTerminal = useMemo(
    () => terminals.find((t) => t.id === activeTerminalId) ?? null,
    [activeTerminalId, terminals]
  );

  return (
    <div className="h-full flex bg-[#0a0a0a]">
      <div className="w-52 border-r border-[rgba(255,255,255,0.15)] flex flex-col py-4 px-4 bg-[rgba(0,0,0,0.3)]">
        <button
          type="button"
          onClick={handleAddTerminal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] text-[rgba(255,255,255,0.5)] hover:text-[#00FF00] hover:bg-[rgba(0,255,0,0.1)] transition-all border border-transparent hover:border-[rgba(0,255,0,0.2)]"
        >
          <Plus className="h-3 w-3" />
          <span>[new]</span>
        </button>

        <div className="flex-1 space-y-1 overflow-auto">
          {terminals.map((term) => (
            <div
              key={term.id}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] transition-all ${
                activeTerminalId === term.id
                  ? 'bg-[rgba(0,255,0,0.15)] text-[#00FF00] border border-[rgba(0,255,0,0.3)]'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
              onClick={() => setActiveTerminal(term.id)}
            >
              <Terminal className="h-3 w-3 shrink-0" />
              <span className="truncate flex-1">{term.name}</span>
              {terminals.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTerminal(term.id);
                  }}
                  className="ml-1 hover:bg-[rgba(255,0,0,0.3)] rounded p-0.5 shrink-0"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        {activeTerminal && isTaskReady && workingDir && (
          <CanvasTerminal
            key={activeTerminal.id}
            taskId={activeTerminal.id}
            workingDir={workingDir}
          />
        )}
      </div>
    </div>
  );
}
