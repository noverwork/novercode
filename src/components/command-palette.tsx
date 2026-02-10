import { Folder, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Project, Task } from '@/hooks/useKanban';

type ResultType = 'project' | 'task';

interface SearchResult {
  type: ResultType;
  project: Project;
  task?: Task;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  tasks: Task[];
  currentProjectId: string | null;
  selectedTaskId: string | null;
  onProjectSelect: (id: string) => void;
  onTaskSelect: (id: string) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  projects,
  tasks,
  currentProjectId,
  selectedTaskId,
  onProjectSelect,
  onTaskSelect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    const q = query.toLowerCase().trim();

    if (!q) {
      // Reset to all projects when query is empty
      setResults(
        projects.map((p) => ({
          type: 'project' as const,
          project: p,
        }))
      );
      return;
    }

    const projectResults = projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({ type: 'project' as const, project: p }));

    const taskResults = tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      )
      .map((t) => ({
        type: 'task' as const,
        project: projects.find((p) => p.id === t.projectId)!,
        task: t,
      }));

    // Update results when query or data changes
    setResults([...projectResults, ...taskResults]);
  }, [query, projects, tasks]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    // Reset selection when results change
    setSelectedIndex(0);
  }, [results]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter': {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
        break;
      }
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'project') {
      onProjectSelect(result.project.id);
    } else if (result.task) {
      onTaskSelect(result.task.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] font-mono max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[#FFFFFF] font-black uppercase">Command Palette</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgba(255,255,255,0.4)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects and tasks..."
              autoFocus
              className="pl-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[rgba(255,255,255,0.4)]">
              <span className="hidden sm:inline">type to search</span>
            </div>
          </div>

          <div className="max-h-80 overflow-auto">
            {results.length === 0 ? (
              <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-sm">
                <p>no results found</p>
                <p className="text-xs mt-2">try a different search term</p>
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => {
                  const isSelected = index === selectedIndex;
                  const isActiveProject = result.project.id === currentProjectId;
                  const isActiveTask = result.task?.id === selectedTaskId;

                  return (
                    <button
                      key={
                        result.type === 'project'
                          ? `project-${result.project.id}`
                          : `task-${result.task!.id}`
                      }
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-left transition-colors ${
                        isSelected
                          ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                          : 'hover:bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)]'
                      }`}
                    >
                      <div className="w-16 flex items-center justify-center text-xs uppercase text-[rgba(255,255,255,0.4)]">
                        {result.type}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {result.type === 'project' ? (
                            <>
                              <Folder className="h-3 w-3" />
                              <span className="truncate">{result.project.name}</span>
                              {isActiveProject && (
                                <span className="text-[rgba(255,255,255,0.5)] text-xs">
                                  current
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span>→</span>
                              <span className="truncate font-medium">{result.task!.title}</span>
                              {isActiveTask && (
                                <span className="text-[rgba(255,255,255,0.5)] text-xs">active</span>
                              )}
                            </>
                          )}
                        </div>

                        {result.type === 'task' && result.task?.description && (
                          <p className="text-xs text-[rgba(255,255,255,0.4)] truncate mt-1 ml-5">
                            {result.task.description}
                          </p>
                        )}

                        {result.type === 'task' && (
                          <p className="text-xs text-[rgba(255,255,255,0.3)] mt-1 ml-5">
                            in {result.project.name}
                          </p>
                        )}
                      </div>

                      {isSelected && <div className="text-xs text-[rgba(255,255,255,0.5)]">↵</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="text-xs text-[rgba(255,255,255,0.3)] font-mono border-t border-[rgba(255,255,255,0.15)] pt-3 flex justify-between">
              <span>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </span>
              <span>
                <span className="hidden sm:inline">↑↓ to navigate, </span>
                enter to select
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
