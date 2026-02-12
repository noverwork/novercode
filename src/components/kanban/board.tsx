import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { FileDiff, Terminal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { AddProjectDialog } from '@/components/kanban/add-project-dialog';
import { AddTaskDialog } from '@/components/kanban/add-task-dialog';
import { DiffView } from '@/components/kanban/diff-view';
import { ProgressDialog } from '@/components/kanban/progress-dialog';
import { TerminalPanel } from '@/components/kanban/terminal-panel';
import { Button } from '@/components/ui/button';
import { useKanban } from '@/hooks/use-kanban';

type ViewMode = 'terminal' | 'diff';

type WorktreeState =
  | { status: 'idle' }
  | { status: 'loading'; taskId: string }
  | { status: 'ready'; taskId: string; dir: string | null };

type CopyProgressStatus = 'in_progress' | 'completed' | 'failed';

type DeleteProgressStatus = 'in_progress' | 'completed' | 'failed';

type CopyTaskError = {
  code: string;
  message: string;
  task_id: string;
  project_id: string;
  task_path: string | null;
  copied_files: number;
  total_files: number;
};

type DeleteTaskError = {
  code: string;
  message: string;
  task_id: string;
  project_id: string;
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

type DeleteProgressData = {
  task_id: string;
  project_id: string;
  progress: number;
  status: DeleteProgressStatus;
  error: DeleteTaskError | null;
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
  const [viewMode, setViewMode] = useState<ViewMode>('terminal');
  const [worktree, setWorktree] = useState<WorktreeState>({ status: 'idle' });
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [copyProgress, setCopyProgress] = useState<CopyProgressData | undefined>(undefined);
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgressData | undefined>(undefined);
  const selectionRequestRef = useRef(0);

  const workingDir = useMemo(() => {
    if (worktree.status === 'ready' && worktree.taskId === selectedTaskId) {
      return worktree.dir;
    }
    return null;
  }, [worktree, selectedTaskId]);

  const isWorktreeReady = useMemo(() => {
    if (!selectedTaskId) return false;
    return worktree.status === 'ready' && worktree.taskId === selectedTaskId && Boolean(workingDir);
  }, [worktree, selectedTaskId, workingDir]);

  const selectedTask = useMemo(
    () => allTasks.find((t) => t.id === selectedTaskId) || null,
    [allTasks, selectedTaskId]
  );

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

  const handleSelectTask = useCallback(
    async (id: string) => {
      setSelectedTaskId(id);

      const task = allTasks.find((item) => item.id === id);
      const taskProject = task ? projects.find((item) => item.id === task.projectId) : null;
      const project = taskProject || currentProject;

      if (!project?.path) {
        setWorktree({ status: 'ready', taskId: id, dir: null });
        return;
      }

      const requestId = selectionRequestRef.current + 1;
      selectionRequestRef.current = requestId;
      setWorktree({ status: 'loading', taskId: id });

      try {
        const path = await invoke<string | null>('get_task_working_dir', {
          taskId: id,
          projectId: project.id,
          projectPath: project.path,
        });

        if (selectionRequestRef.current === requestId) {
          setWorktree({
            status: 'ready',
            taskId: id,
            dir: path || null,
          });
        }
      } catch (e) {
        console.error('Failed to resolve working directory:', e);
        if (selectionRequestRef.current === requestId) {
          setWorktree({
            status: 'ready',
            taskId: id,
            dir: null,
          });
        }
      }
    },
    [allTasks, currentProject, projects]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      setDeleteProgress(undefined);
      setProgressDialogOpen(true);

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
        setProgressDialogOpen(false);
      }
    },
    [deleteTask, selectedTaskId]
  );

  const handleAddTask = useCallback(
    async (title: string) => {
      setAddTaskOpen(false);

      const newTaskId = await addTask(title, '');
      if (!newTaskId || !currentProjectId) {
        return;
      }

      const project = projects.find((p) => p.id === currentProjectId);
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

      await handleSelectTask(newTaskId);
    },
    [addTask, currentProjectId, projects, handleSelectTask]
  );

  const handleAddProject = useCallback(
    async (name: string, path?: string, baseBranch?: string) => {
      await addProject(name, path, baseBranch);
      return '';
    },
    [addProject]
  );

  useEffect(() => {
    let unlistenCopy: (() => void) | undefined;
    let unlistenDelete: (() => void) | undefined;
    let progressTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupListeners = async () => {
      try {
        unlistenCopy = await listen<CopyProgressData>('copy-progress', (event) => {
          const progress = event.payload;
          setCopyProgress(progress);

          if (progress.status === 'completed' || progress.status === 'failed') {
            if (progressTimeout) clearTimeout(progressTimeout);
            progressTimeout = setTimeout(() => {
              setProgressDialogOpen(false);
            }, 500);
          }
        });

        unlistenDelete = await listen<DeleteProgressData>('delete-progress', (event) => {
          const progress = event.payload;
          setDeleteProgress(progress);

          if (progress.status === 'completed' || progress.status === 'failed') {
            if (progressTimeout) clearTimeout(progressTimeout);
            progressTimeout = setTimeout(() => {
              setProgressDialogOpen(false);
            }, 500);
          }
        });
      } catch (error) {
        console.error('Failed to listen to progress events:', error);
      }
    };

    setupListeners();

    return () => {
      if (progressTimeout) clearTimeout(progressTimeout);
      unlistenCopy?.();
      unlistenDelete?.();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'terminal' ? 'diff' : 'terminal'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        <Breadcrumbs
          currentProject={currentProject}
          selectedTask={selectedTask}
          projects={projects}
          tasks={currentTasks}
          onProjectSelect={(id) => setCurrentProjectId(id)}
          onTaskSelect={handleSelectTask}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
          onAddProject={() => setAddProjectOpen(true)}
          onAddTask={() => setAddTaskOpen(true)}
        />
        <div className="flex-1" />
        {selectedTask && (
          <div className="pr-4 flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('terminal')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                viewMode === 'terminal'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#00FF00]'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <Terminal className="h-3 w-3 mr-1" />
              terminal
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setViewMode('diff')}
              className={`px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
                viewMode === 'diff'
                  ? 'bg-[rgba(255,255,255,0.1)] text-[#00FF00]'
                  : 'text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <FileDiff className="h-3 w-3 mr-1" />
              diff
            </Button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-hidden relative">
        {selectedTaskId ? (
          <>
            <div className="absolute inset-0">
              <TerminalPanel
                taskId={selectedTaskId}
                workingDir={workingDir || undefined}
                isTaskReady={isWorktreeReady}
              />
            </div>
            <div
              className={`absolute inset-0 transition-opacity duration-150 ${
                viewMode === 'diff'
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <DiffView workingDir={workingDir || undefined} active={viewMode === 'diff'} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.4)] font-mono">
            <p>{currentProjectId ? 'select a task to start' : 'select a project'}</p>
          </div>
        )}
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
        progress={deleteProgress || copyProgress}
        operation={deleteProgress ? 'delete' : 'copy'}
      />
    </div>
  );
}
