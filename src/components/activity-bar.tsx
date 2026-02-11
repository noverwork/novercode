import { Folder, ListTodo, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { Project, Task } from '@/hooks/use-kanban';

interface ActivityBarProps {
  projects: Project[];
  tasks: Task[];
  currentProjectId: string | null;
  currentProject: Project | null;
  selectedTaskId: string | null;
  onProjectSelect: (id: string) => void;
  onTaskSelect: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

type ActivePanel = 'projects' | 'tasks' | null;

export function ActivityBar({
  projects,
  tasks,
  currentProjectId,
  currentProject,
  selectedTaskId,
  onProjectSelect,
  onTaskSelect,
  onDeleteProject,
  onDeleteTask,
}: ActivityBarProps) {
  const [expanded, setExpanded] = useState<ActivePanel>(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        if (expanded) {
          setExpanded(null);
        } else if (projects.length > 0) {
          setExpanded('projects');
        } else if (currentProject && tasks.length > 0) {
          setExpanded('tasks');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded, projects, currentProject, tasks]);

  const handleIconClick = (panel: ActivePanel) => {
    if (expanded === panel) {
      setExpanded(null);
    } else {
      setExpanded(panel);
    }
  };

  return (
    <>
      <div
        className="w-[50px] border-r border-[rgba(255,255,255,0.15)] bg-[#0a0a0a] flex flex-col items-center py-4 gap-1 relative z-20"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => !expanded && setIsHovering(false)}
      >
        <Button
          size="icon"
          variant="ghost"
          className={`h-9 w-9 border-l-2 transition-colors ${
            expanded === 'projects'
              ? 'border-l-[#FFFFFF] bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
              : 'border-l-transparent text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]'
          }`}
          onClick={() => handleIconClick('projects')}
        >
          <Folder className="h-4 w-4" />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          className={`h-9 w-9 border-l-2 transition-colors ${
            expanded === 'tasks'
              ? 'border-l-[#FFFFFF] bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
              : 'border-l-transparent text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]'
          }`}
          onClick={() => handleIconClick('tasks')}
        >
          <ListTodo className="h-4 w-4" />
        </Button>

        <div className="flex-1" />
      </div>

      {(expanded || isHovering) && (
        <div
          className={`absolute left-[50px] top-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-[rgba(255,255,255,0.15)] z-10 flex flex-col transition-transform duration-150 ease-out ${
            expanded ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
          onMouseEnter={() => setExpanded(expanded || (isHovering ? expanded : null))}
          onMouseLeave={() => setExpanded(null)}
        >
          {expanded === 'projects' && (
            <div className="flex-1 flex flex-col">
              <div className="h-9 px-4 border-b border-[rgba(255,255,255,0.15)] flex items-center">
                <span className="text-xs text-[rgba(255,255,255,0.6)] font-[Helvetica_Neue,Arial,sans-serif] uppercase tracking-[0.2em]">
                  Projects
                </span>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                    <p>no projects</p>
                  </div>
                ) : (
                  projects.map((project) => (
                    <div
                      key={project.id}
                      className={`group flex items-center gap-2 px-3 py-2 font-mono text-sm cursor-pointer transition-colors ${
                        project.id === currentProjectId
                          ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                          : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]'
                      }`}
                      onClick={() => {
                        onProjectSelect(project.id);
                        setExpanded(null);
                      }}
                    >
                      <Folder className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{project.name}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-[rgba(255,255,255,0.4)] hover:text-[#FF0000] hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {expanded === 'tasks' && (
            <div className="flex-1 flex flex-col">
              <div className="h-9 px-4 border-b border-[rgba(255,255,255,0.15)] flex items-center">
                <span className="text-xs text-[rgba(255,255,255,0.6)] font-[Helvetica_Neue,Arial,sans-serif] uppercase tracking-[0.2em]">
                  Tasks
                </span>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {!currentProjectId ? (
                  <div className="text-center py-12 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                    <p>select a project</p>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-12 text-[rgba(255,255,255,0.4)] font-mono text-xs">
                    <p>no tasks</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group p-3 border cursor-pointer transition-colors ${
                          task.id === selectedTaskId
                            ? 'border-[#00FF00] bg-[rgba(0,255,0,0.1)]'
                            : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.05)]'
                        }`}
                        onClick={() => {
                          onTaskSelect(task.id);
                          setExpanded(null);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[rgba(255,255,255,0.4)] font-mono text-xs">→</span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium font-mono truncate ${
                                task.id === selectedTaskId
                                  ? 'text-[#00FF00]'
                                  : 'text-[rgba(255,255,255,0.7)]'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-[rgba(255,255,255,0.5)] whitespace-pre-wrap font-mono mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
