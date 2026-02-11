import { invoke } from '@tauri-apps/api/core';
import { Plus, Terminal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CanvasTerminal } from './canvas-terminal';

interface TerminalInfo {
  id: string;
  name: string;
}

interface TerminalPanelProps {
  taskId: string;
  workingDir?: string;
}

export function TerminalPanel({ taskId, workingDir }: TerminalPanelProps) {
  const [terminals, setTerminals] = useState<TerminalInfo[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (taskId && !initializedRef.current) {
      initializedRef.current = true;
      const initialId = crypto.randomUUID();
      setTerminals([{ id: initialId, name: 'Terminal 1' }]);
      setActiveTerminalId(initialId);
    }
  }, [taskId]);

  const handleAddTerminal = useCallback(() => {
    if (taskId && terminals.length === 0) {
      const initialId = crypto.randomUUID();
      setTerminals([{ id: initialId, name: 'Terminal 1' }]);
      setActiveTerminalId(initialId);
    } else {
      const newId = crypto.randomUUID();
      const newName = `Terminal ${terminals.length + 1}`;
      setTerminals([...terminals, { id: newId, name: newName }]);
      setActiveTerminalId(newId);
    }
  }, [taskId, terminals]);

  const handleCloseTerminal = useCallback(
    (id: string) => {
      invoke('terminal_kill', { id }).catch(console.error);
      setTerminals((prev) => {
        const remaining = prev.filter((t) => t.id !== id);
        if (activeTerminalId === id) {
          setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
    },
    [activeTerminalId]
  );

  useEffect(() => {
    return () => {
      terminals.forEach((term) => {
        invoke('terminal_kill', { id: term.id }).catch(console.error);
      });
    };
  }, [terminals]);

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <div className="border-b border-[rgba(255,255,255,0.15)] flex items-center px-2 py-1 gap-1 bg-[rgba(0,0,0,0.3)]">
        {terminals.map((term) => (
          <div
            key={term.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] transition-all ${
              activeTerminalId === term.id
                ? 'bg-[rgba(0,255,0,0.15)] text-[#00FF00] border border-[rgba(0,255,0,0.3)]'
                : 'text-[rgba(255,255,255,0.5)] hover:text-[rgba(255,255,255,0.8)] hover:bg-[rgba(255,255,255,0.05)]'
            }`}
            onClick={() => setActiveTerminalId(term.id)}
          >
            <Terminal className="h-3 w-3" />
            <span>{term.name}</span>
            {terminals.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseTerminal(term.id);
                }}
                className="ml-1 hover:bg-[rgba(255,0,0,0.3)] rounded p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddTerminal}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] text-[rgba(255,255,255,0.5)] hover:text-[#00FF00] hover:bg-[rgba(0,255,0,0.1)] transition-all border border-transparent hover:border-[rgba(0,255,0,0.2)]"
        >
          <Plus className="h-3 w-3" />
          <span>[new]</span>
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTerminal && (
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
