import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FolderPlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActivityBar } from '@/components/activity-bar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AddProjectDialog } from '@/components/kanban/add-project-dialog';
import { AddTaskDialog } from '@/components/kanban/add-task-dialog';
import { DiffView } from '@/components/kanban/diff-view';
import { ProgressDialog } from '@/components/kanban/progress-dialog';
import { TerminalPanel } from '@/components/kanban/terminal-panel';
import { useKanban } from '@/hooks/useKanban';

type WorktreeState =
  | { status: 'idle' }
  | { status: 'loading'; taskId: string }
  | { status: 'ready'; taskId: string; dir: string | null };

type CopyProgressStatus = 'in_progress' | 'completed' | 'failed';

type CopyTaskError = {
  code: string;
  message: string;
  task_id: string;
  project_id: string;
  task_path: string | null;
  copied_files: number;
  total_files: number;
};

type CopyProgressData = {
  task_id: string;
  project_id: string;
  progress: number;
  copied_files: number;
  total_files: number;
  status: CopyProgressStatus;
  task_path: string;
  error: CopyTaskError | null;
};

async function killTerminal(terminalId: string) {
  try {
    await invoke('terminal_kill', { id: terminalId });
  } catch (e) {
    console.error('Failed to kill terminal:', e);
  }
}

export function Board() {
  const {
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    addProject,
    deleteProject,
    getTasksByProject,
    tasks: currentTasks,
    allTasks,
    addTask,
    deleteTask,
  } = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [worktree, setWorktree] = useState<WorktreeState>({ status: 'idle' });
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [copyProgress, setCopyProgress] = useState<CopyProgressData | undefined>(undefined);

  const workingDir = useMemo(() => {
    if (worktree.status === 'ready' && worktree.taskId === selectedTaskId) {
      return worktree.dir;
    }
    return null;
  }, [worktree, selectedTaskId]);

  const isWorktreeReady = useMemo(() => {
    if (!selectedTaskId) return false;
    return worktree.status === 'ready' && worktree.taskId === selectedTaskId;
  }, [worktree, selectedTaskId]);

  const selectedTask = useMemo(
    () => allTasks.find((t) => t.id === selectedTaskId) || null,
    [allTasks, selectedTaskId]
  );

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (!selectedTaskId) {
      setWorktree({ status: 'idle' });
      return;
    }

    const task = allTasks.find((item) => item.id === selectedTaskId);
    const taskProject = task ? projects.find((item) => item.id === task.projectId) : null;
    const project = taskProject || currentProject;

    if (!project?.path) {
      // No path means project doesn't have workspace path
      setWorktree({ status: 'ready', taskId: selectedTaskId, dir: null });
      return;
    }

    // Set loading state for async workspace resolution
    setWorktree({ status: 'loading', taskId: selectedTaskId });

    let cancelled = false;
    const resolveWorkingDir = async () => {
      try {
        const path = await invoke<string | null>('get_task_working_dir', {
          taskId: selectedTaskId,
          projectId: project.id,
          projectPath: project.path,
        });
        if (!cancelled) {
          setWorktree({
            status: 'ready',
            taskId: selectedTaskId,
            dir: path || project.path || null,
          });
        }
      } catch (e) {
        console.error('Failed to resolve working directory:', e);
        if (!cancelled) {
          setWorktree({
            status: 'ready',
            taskId: selectedTaskId,
            dir: project.path || null,
          });
        }
      }
    };

    resolveWorkingDir();
    return () => {
      cancelled = true;
    };
  }, [selectedTaskId, allTasks, currentProject, projects]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  const handleDeleteProject = async (projectId: string) => {
    const projectTasks = getTasksByProject(projectId);
    const project = projects.find((p) => p.id === projectId);

    if (project) {
      for (const t of projectTasks) {
        await killTerminal(t.id);
        try {
          await invoke('remove_worktree', {
            taskId: t.id,
            projectName: project.name,
            projectPath: project.path,
          });
        } catch (e) {
          console.error('Failed to remove task workspace:', e);
        }
      }
    }

    if (selectedTaskId) {
      const task = projectTasks.find((t) => t.id === selectedTaskId);
      if (task) {
        setSelectedTaskId(null);
      }
    }
    await deleteProject(projectId);
  };

  const handleSelectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
  }, []);

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await deleteTask(taskId);
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null);
          setWorktree({ status: 'idle' });
        }
      } catch (e) {
        console.error('Failed to delete task:', e);
        const message =
          typeof e === 'string' ? e : e instanceof Error ? e.message : JSON.stringify(e);
        window.alert(`Task delete failed: ${message}`);
      }
    },
    [deleteTask, selectedTaskId]
  );

  const handleAddTask = useCallback(
    async (title: string) => {
      setAddTaskOpen(false);

      await addTask(title, '');
      const newTaskId = allTasks[allTasks.length - 1]?.id;
      if (newTaskId) {
        const task = allTasks[allTasks.length - 1];
        const project = projects.find((p) => p.id === task?.projectId);

        if (project?.path) {
          setCopyProgress(undefined);
          setProgressDialogOpen(true);

          try {
            await invoke('copy_task', {
              taskId: newTaskId,
              projectId: project.id,
              projectPath: project.path,
            });
          } catch (e) {
            console.error('Failed to copy project:', e);
            setProgressDialogOpen(false);
          }
        }

        handleSelectTask(newTaskId);
      }
    },
    [addTask, allTasks, projects, handleSelectTask]
  );

  const handleAddProject = useCallback(
    async (name: string, path?: string, baseBranch?: string) => {
      await addProject(name, path, baseBranch);
      return '';
    },
    [addProject]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let progressTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<CopyProgressData>('copy-progress', (event) => {
          const progress = event.payload;
          setCopyProgress(progress);

          if (progress.status === 'completed' || progress.status === 'failed') {
            if (progressTimeout) clearTimeout(progressTimeout);
            progressTimeout = setTimeout(() => {
              setProgressDialogOpen(false);
            }, 500);
          }
        });
      } catch (error) {
        console.error('Failed to listen to copy-progress:', error);
      }
    };

    setupListener();

    return () => {
      if (progressTimeout) clearTimeout(progressTimeout);
      unlisten?.();
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <div className="scanlines" />

      <header className="border-b border-[rgba(255,255,255,0.15)] flex items-center">
        <h1
          className="px-6 py-4 text-xl font-black text-[#FFFFFF] uppercase tracking-[0.1em]"
          style={{
            fontFamily: 'Times New Roman, Georgia, serif',
            transform: 'scaleY(0.8) scaleX(0.9)',
          }}
        >
          NOVERCODE
        </h1>
        {currentProject && (
          <Breadcrumbs
            currentProject={currentProject}
            selectedTask={selectedTask}
            projects={projects}
            tasks={currentTasks}
            currentProjectId={currentProjectId}
            onProjectSelect={setCurrentProjectId}
            onTaskSelect={handleSelectTask}
          />
        )}
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <ActivityBar
          projects={projects}
          tasks={allTasks}
          currentProjectId={currentProjectId}
          currentProject={currentProject}
          selectedTaskId={selectedTaskId}
          onProjectSelect={setCurrentProjectId}
          onTaskSelect={handleSelectTask}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
        />

        <div className="flex-1 flex relative">
          {selectedTaskId && isWorktreeReady ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-[60%] flex flex-col border-r border-[rgba(255,255,255,0.15)]">
                <TerminalPanel taskId={selectedTaskId} workingDir={workingDir || undefined} />
              </div>
              <div className="w-[40%] flex flex-col">
                <DiffView workingDir={workingDir || undefined} />
              </div>
            </div>
          ) : selectedTaskId && !isWorktreeReady ? (
            <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.5)] font-mono gap-3">
              <div className="h-6 w-6 border-2 border-[#00FF00] border-t-transparent rounded-full animate-spin" />
              <p>loading workspace...</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.4)] font-mono">
              <p>{currentProjectId ? 'select a task to start' : 'select a project'}</p>
            </div>
          )}
          <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAddProjectOpen(true)}
              aria-label="add project"
              className="h-11 w-11 cursor-pointer rounded-lg border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.7)] transition-all duration-200 hover:border-[rgba(255,255,255,0.35)] hover:bg-[rgba(255,255,255,0.12)] hover:text-[#FFFFFF]"
            >
              <FolderPlus className="mx-auto h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setAddTaskOpen(true)}
              aria-label="add task"
              disabled={!currentProjectId}
              className="h-11 w-11 cursor-pointer rounded-lg border border-[rgba(0,255,0,0.45)] bg-[rgba(0,255,0,0.12)] text-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.3)] transition-all duration-200 hover:bg-[rgba(0,255,0,0.2)] hover:shadow-[0_0_16px_rgba(0,255,0,0.45)] disabled:cursor-not-allowed disabled:border-[rgba(255,255,255,0.12)] disabled:bg-[rgba(255,255,255,0.06)] disabled:text-[rgba(255,255,255,0.35)] disabled:shadow-none"
            >
              <Plus className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t border-[rgba(255,255,255,0.15)] px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-[rgba(255,255,255,0.5)] font-mono">
          [ONLINE] | projects: {projects.length} | tasks: {currentTasks.length} | ready
        </span>
      </footer>

      <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} onAdd={handleAddTask} />
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onAdd={handleAddProject}
      />
      <ProgressDialog
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
        progress={copyProgress}
      />
    </div>
  );
}
