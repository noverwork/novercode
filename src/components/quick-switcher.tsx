import { Command, Search, Terminal, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Project, Task } from '@/hooks/use-kanban';

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'projects' | 'tasks';
  projects: Project[];
  tasks: Task[];
  currentProjectId: string | null;
  selectedTaskId: string | null;
  onProjectSelect: (id: string) => void;
  onTaskSelect: (id: string) => void;
  recentTasks?: Task[];
}

export function QuickSwitcher({
  open,
  onOpenChange,
  mode,
  projects,
  tasks,
  currentProjectId,
  selectedTaskId,
  onProjectSelect,
  onTaskSelect,
  recentTasks,
}: QuickSwitcherProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredTasks = tasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()));

  const displayItems = mode === 'projects' ? filteredProjects : filteredTasks;

  const getItemLabel = (item: Project | Task) => {
    if (mode === 'projects') {
      return (item as Project).name;
    }
    return (item as Task).title;
  };

  const getItemSubLabel = (item: Project | Task) => {
    if (mode === 'projects') {
      return (item as Project).path || 'no path';
    }
    return (item as Task).description || '';
  };

  const isItemSelected = (item: Project | Task) => {
    if (mode === 'projects') {
      return (item as Project).id === currentProjectId;
    }
    return (item as Task).id === selectedTaskId;
  };

  const handleSelect = useCallback(
    (item: Project | Task) => {
      if (mode === 'projects') {
        onProjectSelect((item as Project).id);
      } else {
        onTaskSelect((item as Task).id);
      }
      onOpenChange(false);
    },
    [mode, onOpenChange, onProjectSelect, onTaskSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % displayItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (displayItems[selectedIndex]) {
            handleSelect(displayItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [displayItems, selectedIndex, handleSelect, onOpenChange]
  );

  const isRecentTask = (task: Task) => {
    return recentTasks?.some((t) => t.id === task.id);
  };

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (open && !wasOpenRef.current && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
    wasOpenRef.current = open;
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  const getTaskNumber = (index: number) => {
    if (index < 9) {
      return `Cmd+${index + 1}`;
    }
    return '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] max-w-2xl"
        onPointerDownOutside={() => onOpenChange(false)}
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            {mode === 'projects' ? (
              <Command className="h-5 w-5 text-[rgba(255,255,255,0.6)]" />
            ) : (
              <Terminal className="h-5 w-5 text-[rgba(255,255,255,0.6)]" />
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.4)]" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${mode === 'projects' ? 'projects' : 'tasks'}...`}
                className="pl-10"
              />
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)] rounded p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-auto">
            {displayItems.length === 0 ? (
              <div className="text-center py-12 text-[rgba(255,255,255,0.3)] font-mono text-sm">
                No results found
              </div>
            ) : (
              <div className="space-y-1">
                {displayItems.map((item, index) => (
                  <button
                    key={mode === 'projects' ? (item as Project).id : (item as Task).id}
                    onClick={() => handleSelect(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSelect(item);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 font-mono text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                        : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {mode === 'tasks' && isRecentTask(item as Task) && (
                          <div className="text-[#00FF00] text-xs font-mono uppercase tracking-wider">
                            recent
                          </div>
                        )}
                        <span className="truncate font-medium">{getItemLabel(item)}</span>
                      </div>
                      {getItemSubLabel(item) && (
                        <span className="text-xs text-[rgba(255,255,255,0.4)] truncate">
                          {getItemSubLabel(item)}
                        </span>
                      )}
                    </div>
                    {mode === 'tasks' && index < 9 && (
                      <div className="text-xs text-[rgba(255,255,255,0.3)] font-mono">
                        {getTaskNumber(index)}
                      </div>
                    )}
                    {isItemSelected(item) && <div className="w-2 h-2 bg-[#00FF00] rounded-full" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
