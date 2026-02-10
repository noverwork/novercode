import { invoke } from '@tauri-apps/api/core';
import { useEffect, useMemo, useState } from 'react';

import { ActivityBar } from '@/components/activity-bar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CommandPalette } from '@/components/command-palette';
import { CanvasTerminal } from '@/components/kanban/canvas-terminal';
import { DiffView } from '@/components/kanban/diff-view';
import { useKanban } from '@/hooks/useKanban';

type WorktreeState =
  | { status: 'idle' }
  | { status: 'loading'; taskId: string }
  | { status: 'ready'; taskId: string; dir: string | null };

async function killTerminal(taskId: string) {
  try {
    await invoke('terminal_kill', { id: taskId });
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
    deleteProject,
    getTasksByProject,
    tasks,
    deleteTask,
  } = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [worktree, setWorktree] = useState<WorktreeState>({ status: 'idle' });
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  /* eslint-disable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
  useEffect(() => {
    if (!selectedTaskId) return;

    if (!currentProject?.path) {
      // No path means project doesn't have git - skip worktree
      setWorktree({ status: 'ready', taskId: selectedTaskId, dir: null });
      return;
    }

    // Set loading state for async worktree creation
    setWorktree({ status: 'loading', taskId: selectedTaskId });

    let cancelled = false;
    const setupWorktree = async () => {
      try {
        const path = await invoke<string>('create_worktree', {
          taskId: selectedTaskId,
          projectName: currentProject.name,
          projectPath: currentProject.path,
          baseBranch: currentProject.baseBranch,
        });
        if (!cancelled) {
          setWorktree({ status: 'ready', taskId: selectedTaskId, dir: path });
        }
      } catch (e) {
        console.error('Failed to create worktree:', e);
        if (!cancelled) {
          setWorktree({
            status: 'ready',
            taskId: selectedTaskId,
            dir: currentProject.path || null,
          });
        }
      }
    };

    setupWorktree();
    return () => {
      cancelled = true;
    };
  }, [selectedTaskId, currentProject?.path, currentProject?.name, currentProject?.baseBranch]);
  /* eslint-enable react-hooks/set-state-in-effect, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */

  const handleDeleteTask = async (id: string) => {
    await killTerminal(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
    if (currentProject) {
      try {
        await invoke('remove_worktree', {
          taskId: id,
          projectName: currentProject.name,
          projectPath: currentProject.path,
        });
      } catch (e) {
        console.error('Failed to remove worktree:', e);
      }
    }
    await deleteTask(id);
  };

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
          console.error('Failed to remove worktree:', e);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-black">
      <div className="scanlines" />

      <header className="border-b border-green-900 flex items-center">
        <h1 className="px-6 py-4 text-xl font-bold text-green-500 text-glow">[ NOVERCODE ]</h1>
        {currentProject && (
          <Breadcrumbs
            currentProject={currentProject}
            selectedTask={selectedTask}
            projects={projects}
            tasks={tasks}
            currentProjectId={currentProjectId}
            onProjectSelect={setCurrentProjectId}
            onTaskSelect={setSelectedTaskId}
          />
        )}
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <ActivityBar
          projects={projects}
          tasks={tasks}
          currentProjectId={currentProjectId}
          currentProject={currentProject}
          selectedTaskId={selectedTaskId}
          onProjectSelect={setCurrentProjectId}
          onTaskSelect={setSelectedTaskId}
          onDeleteProject={handleDeleteProject}
          onDeleteTask={handleDeleteTask}
        />

        <div className="flex-1 flex">
          {selectedTaskId && isWorktreeReady ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-[60%] flex flex-col border-r border-green-900">
                <CanvasTerminal taskId={selectedTaskId} workingDir={workingDir || undefined} />
              </div>
              <div className="w-[40%] flex flex-col">
                <DiffView workingDir={workingDir || undefined} />
              </div>
            </div>
          ) : selectedTaskId && !isWorktreeReady ? (
            <div className="flex-1 flex items-center justify-center text-green-800 font-mono gap-3">
              <div className="h-6 w-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <p>creating worktree...</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-green-800 font-mono">
              <p>{currentProjectId ? 'select a task to start' : 'select a project'}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="border-t border-green-900 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-green-800">
          [ONLINE] | projects: {projects.length} | tasks: {tasks.length} | ready
        </span>
        <span className="text-xs text-green-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>$</span>
          <span className="cursor-blink">█</span>
        </span>
      </footer>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        projects={projects}
        tasks={tasks}
        currentProjectId={currentProjectId}
        selectedTaskId={selectedTaskId}
        onProjectSelect={setCurrentProjectId}
        onTaskSelect={setSelectedTaskId}
      />
    </div>
  );
}
