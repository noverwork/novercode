import { invoke } from '@tauri-apps/api/core';
import { FolderPlus, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ActivityBar } from '@/components/activity-bar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { AddProjectDialog } from '@/components/kanban/add-project-dialog';
import { AddTaskDialog } from '@/components/kanban/add-task-dialog';
import { CanvasTerminal } from '@/components/kanban/canvas-terminal';
import { DiffView } from '@/components/kanban/diff-view';
import { QuickSwitcher } from '@/components/quick-switcher';
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
    addProject,
    deleteProject,
    getTasksByProject,
    tasks: currentTasks,
    allTasks,
    addTask,
    deleteTask,
    getRecentTasks,
    trackRecentTask,
  } = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [worktree, setWorktree] = useState<WorktreeState>({ status: 'idle' });
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState(false);
  const [quickSwitcherMode, setQuickSwitcherMode] = useState<'projects' | 'tasks'>('projects');
  const [focusedPanel, setFocusedPanel] = useState<'terminal' | 'diff'>('terminal');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);

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
  const recentTasks = useMemo(() => getRecentTasks(), [getRecentTasks]);

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
  }, [selectedTaskId, recentTasks, currentProject, projects]);
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

  const handleSelectTask = useCallback(
    (id: string) => {
      setSelectedTaskId(id);
      trackRecentTask(id);
    },
    [trackRecentTask]
  );

  const handleQuickSwitchProjects = () => {
    setQuickSwitcherOpen(true);
    setQuickSwitcherMode('projects');
  };

  const handleQuickSwitchTasks = () => {
    setQuickSwitcherOpen(true);
    setQuickSwitcherMode('tasks');
  };

  const handleRecentTask = useCallback(
    (index: number) => {
      const tasksList = recentTasks;
      if (index < tasksList.length && tasksList[index]) {
        handleSelectTask(tasksList[index].id);
      }
    },
    [recentTasks, handleSelectTask]
  );

  const handleTogglePanel = () => {
    setFocusedPanel((prev) => (prev === 'terminal' ? 'diff' : 'terminal'));
  };

  const handleClearSelection = () => {
    setSelectedTaskId(null);
  };

  const handleAddTask = useCallback(
    async (title: string) => {
      await addTask(title, '');
      const newTaskId = allTasks[allTasks.length - 1]?.id;
      if (newTaskId) {
        handleSelectTask(newTaskId);
      }
    },
    [addTask, allTasks, handleSelectTask]
  );

  const handleAddProject = useCallback(
    async (name: string, path?: string, baseBranch?: string) => {
      await addProject(name, path, baseBranch);
      return '';
    },
    [addProject]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        if (currentProjectId) {
          setAddTaskOpen(true);
        }
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handleQuickSwitchProjects();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handleQuickSwitchProjects();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'T') {
        e.preventDefault();
        handleQuickSwitchTasks();
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleRecentTask(parseInt(e.key) - 1);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        handleTogglePanel();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTaskId, recentTasks, currentProject, projects, handleRecentTask, currentProjectId]);

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
          onDeleteTask={deleteTask}
        />

        <div className="flex-1 flex relative">
          {selectedTaskId && isWorktreeReady ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="w-[60%] flex flex-col border-r border-[rgba(255,255,255,0.15)]">
                {focusedPanel === 'terminal' && (
                  <CanvasTerminal taskId={selectedTaskId} workingDir={workingDir || undefined} />
                )}
              </div>
              <div className="w-[40%] flex flex-col">
                {focusedPanel === 'diff' && <DiffView workingDir={workingDir || undefined} />}
              </div>
            </div>
          ) : selectedTaskId && !isWorktreeReady ? (
            <div className="flex-1 flex items-center justify-center text-[rgba(255,255,255,0.5)] font-mono gap-3">
              <div className="h-6 w-6 border-2 border-[#00FF00] border-t-transparent rounded-full animate-spin" />
              <p>creating worktree...</p>
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
        <span className="text-xs text-[rgba(255,255,255,0.5)] flex items-center gap-2">
          <span
            className="w-2 h-2 bg-[#00FF00] rounded-full"
            style={{ boxShadow: '0 0 10px rgba(0,255,0,0.5)' }}
          />
          <span>$</span>
          <span className="cursor-blink">█</span>
          {recentTasks.length > 0 && (
            <>
              <span className="text-[rgba(255,255,255,0.3)]">|</span>
              <span className="text-[rgba(255,255,255,0.5)]">recent: {recentTasks.length}</span>
            </>
          )}
        </span>
        <span className="text-xs text-[rgba(255,255,255,0.5)]">
          <span className="hidden sm:inline">1-9 quick switch | </span>
          <span className="hidden sm:inline">Tab: panels | </span>
          <span>Esc: clear</span>
        </span>
      </footer>

      <QuickSwitcher
        open={quickSwitcherOpen}
        onOpenChange={setQuickSwitcherOpen}
        mode={quickSwitcherMode}
        projects={projects}
        tasks={recentTasks}
        currentProjectId={currentProjectId}
        selectedTaskId={selectedTaskId}
        onProjectSelect={setCurrentProjectId}
        onTaskSelect={handleSelectTask}
      />
      <AddTaskDialog open={addTaskOpen} onOpenChange={setAddTaskOpen} onAdd={handleAddTask} />
      <AddProjectDialog
        open={addProjectOpen}
        onOpenChange={setAddProjectOpen}
        onAdd={handleAddProject}
      />
    </div>
  );
}
