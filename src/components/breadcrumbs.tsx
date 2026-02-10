import { ChevronDown, Folder, FolderPlus, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Project, Task } from '@/hooks/useKanban';

interface BreadcrumbsProps {
  currentProject: Project | null;
  selectedTask: Task | null;
  projects: Project[];
  tasks: Task[];
  currentProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onTaskSelect: (id: string) => void;
  onAddProject?: () => void;
  onAddTask?: () => void;
}

export function Breadcrumbs({
  currentProject,
  selectedTask,
  projects,
  tasks,
  currentProjectId,
  onProjectSelect,
  onTaskSelect,
  onAddProject,
  onAddTask,
}: BreadcrumbsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] font-mono max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF] font-black uppercase">Navigate</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF] border border-[rgba(255,255,255,0.3)]'
                  : 'text-[rgba(255,255,255,0.6)] border border-transparent hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF] border border-[rgba(255,255,255,0.3)]'
                  : 'text-[rgba(255,255,255,0.6)] border border-transparent hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              Tasks
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={onAddProject}
              className="font-mono text-xs uppercase tracking-[0.15em]"
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              [add project]
            </Button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={onAddTask}
              className="font-mono text-xs uppercase tracking-[0.15em]"
            >
              <Plus className="h-3 w-3 mr-1" />
              [add task]
            </Button>
          </div>

          <div className="py-4">
            {activeTab === 'projects' && (
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-sm">
                    <p>no projects found</p>
                    <p className="text-xs mt-2">create a project to get started</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          onProjectSelect(project.id);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-sm text-left transition-colors ${
                          currentProject?.id === project.id
                            ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
                            : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]'
                        }`}
                      >
                        <Folder className="h-3 w-3" />
                        <span className="truncate flex-1">{project.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={onAddProject}
                    className="font-mono text-xs uppercase tracking-[0.15em]"
                  >
                    <FolderPlus className="h-3 w-3 mr-1" />
                    [add project]
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && currentProject && (
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-sm">
                    <p>no tasks in this project</p>
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-auto">
                    {tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          onTaskSelect(task.id);
                          setOpen(false);
                        }}
                        className={`w-full px-3 py-2 font-mono text-sm text-left transition-colors ${
                          selectedTask?.id === task.id
                            ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF] border border-[rgba(255,255,255,0.3)]'
                            : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF] border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[rgba(255,255,255,0.4)]">→</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-[rgba(255,255,255,0.4)] truncate mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={onAddTask}
                    className="font-mono text-xs uppercase tracking-[0.15em]"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    [add task]
                  </Button>
                </div>
              </div>
            )}

            {!currentProjectId && (
              <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-sm">
                <p>no projects found</p>
                <p className="text-xs mt-2">create a project to get started</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
