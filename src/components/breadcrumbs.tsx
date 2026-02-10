import { ChevronDown, FolderPlus, Plus } from 'lucide-react';
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
        className="flex items-center gap-2 px-4 py-2 hover:bg-green-900/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm font-mono">
          {currentProject && (
            <>
              <span className="text-green-500">{currentProject.name}</span>
              <span className="text-green-900">/</span>
            </>
          )}
          {selectedTask ? (
            <span className="text-green-400">{selectedTask.title}</span>
          ) : (
            <span className="text-green-700 italic">no task selected</span>
          )}
        </div>
        <ChevronDown className="h-3 w-3 text-green-700" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-black border border-green-900 text-green-500 font-mono max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-green-500">navigate</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 px-4 py-2 rounded font-mono text-xs transition-colors ${
                activeTab === 'projects'
                  ? 'bg-green-900/40 text-green-400 border border-green-700'
                  : 'text-green-700 border border-transparent hover:bg-green-900/20'
              }`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex-1 px-4 py-2 rounded font-mono text-xs transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-green-900/40 text-green-400 border border-green-700'
                  : 'text-green-700 border border-transparent hover:bg-green-900/20'
              }`}
            >
              Tasks
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={onAddProject}
              className="font-mono text-xs border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20"
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              [add project]
            </Button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              onClick={onAddTask}
              className="font-mono text-xs border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20"
            >
              <Plus className="h-3 w-3 mr-1" />
              [add task]
            </Button>
          </div>

          <div className="py-4">
            {activeTab === 'projects' && (
              <div className="space-y-2">
                {projects.length === 0 ? (
                  <div className="text-center py-8 text-green-900 font-mono text-sm">
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
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded font-mono text-sm text-left transition-colors ${
                          currentProject?.id === project.id
                            ? 'bg-green-900/40 text-green-400'
                            : 'text-green-700 hover:bg-green-900/20 hover:text-green-500'
                        }`}
                      >
                        <span>📁</span>
                        <span className="truncate flex-1">{project.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    onClick={onAddProject}
                    className="font-mono text-xs border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20"
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
                  <div className="text-center py-8 text-green-900 font-mono text-sm">
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
                        className={`w-full px-3 py-2 rounded font-mono text-sm text-left transition-colors ${
                          selectedTask?.id === task.id
                            ? 'bg-green-900/40 text-green-400 border border-green-700'
                            : 'text-green-700 hover:bg-green-900/20 hover:text-green-500 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-green-800">→</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{task.title}</p>
                            {task.description && (
                              <p className="text-xs text-green-800 truncate mt-1">
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
                    className="font-mono text-xs border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    [add task]
                  </Button>
                </div>
              </div>
            )}

            {!currentProjectId && (
              <div className="text-center py-8 text-green-900 font-mono text-sm">
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
