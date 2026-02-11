import { ChevronDown, Folder, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Project, Task } from '@/hooks/use-kanban';

type OpenMenu = 'project' | 'task' | null;

interface BreadcrumbsProps {
  currentProject: Project | null;
  selectedTask: Task | null;
  projects: Project[];
  tasks: Task[];
  onProjectSelect: (id: string | null) => void;
  onTaskSelect: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
  onAddProject?: () => void;
  onAddTask?: () => void;
}

export function Breadcrumbs({
  currentProject,
  selectedTask,
  projects,
  tasks,
  onProjectSelect,
  onTaskSelect,
  onDeleteProject,
  onDeleteTask,
  onAddProject,
  onAddTask,
}: BreadcrumbsProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  return (
    <div className="flex items-center gap-2 px-4 py-2" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setOpenMenu((prev) => (prev === 'project' ? null : 'project'))}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-mono text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
        >
          <span>{currentProject?.name ?? 'select project'}</span>
          <ChevronDown className="h-3 w-3 text-[rgba(255,255,255,0.45)]" />
        </button>

        {openMenu === 'project' && (
          <div className="absolute left-0 top-full mt-1 w-80 bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] z-50 p-2 max-h-64 overflow-auto">
            {projects.length === 0 ? (
              <div className="text-center py-4 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                <p>no projects found</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`group flex items-center gap-2 px-3 py-2 font-mono text-sm transition-colors ${
                        currentProject?.id === project.id
                          ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                          : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]'
                      }`}
                    >
                      <Folder className="h-3 w-3 shrink-0" />
                      <button
                        onClick={() => {
                          onProjectSelect(project.id);
                          setOpenMenu(null);
                        }}
                        className="truncate flex-1 text-left"
                      >
                        {project.name}
                      </button>
                      {onDeleteProject && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.4)] hover:text-[#FF0000] hover:bg-transparent shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-[rgba(255,255,255,0.15)] pt-2 mt-2">
                  <button
                    onClick={() => {
                      onAddProject?.();
                      setOpenMenu(null);
                    }}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] text-[rgba(255,255,255,0.5)] hover:text-[#00FF00] hover:bg-[rgba(0,255,0,0.1)] transition-all border border-transparent hover:border-[rgba(0,255,0,0.2)]"
                  >
                    <Plus className="h-3 w-3" />
                    <span>[new project]</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <span className="text-[rgba(255,255,255,0.3)]">/</span>

      <div className="relative">
        <button
          onClick={() => setOpenMenu((prev) => (prev === 'task' ? null : 'task'))}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm font-mono hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          disabled={!currentProject}
        >
          {selectedTask ? (
            <span className="text-[rgba(255,255,255,0.7)]">{selectedTask.title}</span>
          ) : (
            <span className="text-[rgba(255,255,255,0.4)] italic">no task selected</span>
          )}
          <ChevronDown className="h-3 w-3 text-[rgba(255,255,255,0.45)]" />
        </button>

        {openMenu === 'task' && (
          <div className="absolute left-0 top-full mt-1 w-80 bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] z-50 p-2 max-h-64 overflow-auto">
            {tasks.length === 0 ? (
              <div className="text-center py-4 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                <p>no tasks in this project</p>
              </div>
            ) : (
              <div className="space-y-1">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`group flex items-start gap-2 px-3 py-2 font-mono text-sm transition-colors ${
                      selectedTask?.id === task.id
                        ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF] border border-[rgba(255,255,255,0.3)]'
                        : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF] border border-transparent'
                    }`}
                  >
                    <span className="text-[rgba(255,255,255,0.4)] shrink-0 mt-0.5">→</span>
                    <button
                      onClick={() => {
                        onTaskSelect(task.id);
                        setOpenMenu(null);
                      }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div>
                        <p className="truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-[rgba(255,255,255,0.4)] truncate mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </button>
                    {onDeleteTask && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.4)] hover:text-[#FF0000] hover:bg-[rgba(255,0,0,0.1)] shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[rgba(255,255,255,0.15)] pt-2 mt-2">
              <button
                onClick={() => {
                  onAddTask?.();
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 rounded-sm cursor-pointer text-xs font-mono uppercase tracking-[0.15em] text-[rgba(255,255,255,0.5)] hover:text-[#00FF00] hover:bg-[rgba(0,255,0,0.1)] transition-all border border-transparent hover:border-[rgba(0,255,0,0.2)]"
              >
                <Plus className="h-3 w-3" />
                <span>[new task]</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
