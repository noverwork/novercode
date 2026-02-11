import { ChevronDown, Folder, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Project, Task } from '@/hooks/useKanban';

interface BreadcrumbsProps {
  currentProject: Project | null;
  selectedTask: Task | null;
  projects: Project[];
  tasks: Task[];
  currentProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onTaskSelect: (id: string) => void;
  onDeleteProject?: (id: string) => void;
  onDeleteTask?: (id: string) => void;
}

export function Breadcrumbs({
  currentProject,
  selectedTask,
  projects,
  tasks,
  currentProjectId,
  onProjectSelect,
  onTaskSelect,
  onDeleteProject,
  onDeleteTask,
}: BreadcrumbsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 hover:bg-[rgba(255,255,255,0.05)] transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-mono">
          {currentProject && (
            <>
              <span className="text-[rgba(255,255,255,0.9)]">{currentProject.name}</span>
              <span className="text-[rgba(255,255,255,0.3)]">/</span>
            </>
          )}
          {selectedTask ? (
            <span className="text-[rgba(255,255,255,0.7)]">{selectedTask.title}</span>
          ) : (
            <span className="text-[rgba(255,255,255,0.4)] italic">no task selected</span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-[rgba(255,255,255,0.4)]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] z-50">
          <div className="flex gap-2 p-2 border-b border-[rgba(255,255,255,0.15)]">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                  : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                  : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              Tasks
            </button>
          </div>

          <div className="p-2 max-h-64 overflow-auto">
            {activeTab === 'projects' && (
              <div className="space-y-1">
                {projects.length === 0 ? (
                  <div className="text-center py-4 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                    <p>no projects found</p>
                  </div>
                ) : (
                  projects.map((project) => (
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
                          setOpen(false);
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
                  ))
                )}
              </div>
            )}

            {activeTab === 'tasks' && currentProject && (
              <div className="space-y-1">
                {tasks.length === 0 ? (
                  <div className="text-center py-4 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                    <p>no tasks in this project</p>
                  </div>
                ) : (
                  tasks.map((task) => (
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
                          setOpen(false);
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
                  ))
                )}
              </div>
            )}

            {!currentProjectId && (
              <div className="text-center py-4 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                <p>no projects found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
