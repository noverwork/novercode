import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TaskCard } from "./TaskCard";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddProjectDialog } from "./AddProjectDialog";
import { CanvasTerminal } from "./CanvasTerminal";
import { DiffView } from "./DiffView";
import { useKanban } from "@/hooks/useKanban";
import { Folder, Trash2, Loader2, ChevronLeft, ChevronRight, Terminal, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";

// Kill terminal helper
async function killTerminal(taskId: string) {
  try {
    await invoke("terminal_kill", { id: taskId });
  } catch (e) {
    console.error("Failed to kill terminal:", e);
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
    tasks,
    addTask,
    deleteTask,
  } = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [workingDir, setWorkingDir] = useState<string | null>(null);
  const [isWorktreeReady, setIsWorktreeReady] = useState(false);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"claude" | "diff">("claude");

  // 選擇 task 時建立 worktree
  useEffect(() => {
    if (!selectedTaskId) {
      setWorkingDir(null);
      setIsWorktreeReady(false);
      return;
    }

    // 如果 project 沒有 path，直接標記為 ready
    if (!currentProject?.path) {
      setWorkingDir(null);
      setIsWorktreeReady(true);
      return;
    }

    setIsWorktreeReady(false);
    const setupWorktree = async () => {
      try {
        const path = await invoke<string>("create_worktree", {
          taskId: selectedTaskId,
          projectName: currentProject.name,
          projectPath: currentProject.path,
          baseBranch: currentProject.baseBranch,
        });
        setWorkingDir(path);
      } catch (e) {
        console.error("Failed to create worktree:", e);
        setWorkingDir(currentProject.path || null);
      }
      setIsWorktreeReady(true);
    };

    setupWorktree();
  }, [selectedTaskId, currentProject?.path, currentProject?.name, currentProject?.baseBranch]);

  // 刪除 task 時也移除 worktree
  const handleDeleteTask = async (id: string) => {
    await killTerminal(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setWorkingDir(null);
    }
    // 移除 worktree
    if (currentProject) {
      try {
        await invoke("remove_worktree", {
          taskId: id,
          projectName: currentProject.name,
          projectPath: currentProject.path,
        });
      } catch (e) {
        console.error("Failed to remove worktree:", e);
      }
    }
    await deleteTask(id);
  };

  // 刪除 project 時也要 kill 相關的 terminal 和移除 worktrees
  const handleDeleteProject = async (projectId: string) => {
    const projectTasks = getTasksByProject(projectId);
    const project = projects.find((p) => p.id === projectId);

    // Kill terminals 和移除 worktrees
    if (project) {
      for (const t of projectTasks) {
        await killTerminal(t.id);
        try {
          await invoke("remove_worktree", {
            taskId: t.id,
            projectName: project.name,
            projectPath: project.path,
          });
        } catch (e) {
          console.error("Failed to remove worktree:", e);
        }
      }
    }

    if (selectedTaskId) {
      const task = projectTasks.find((t) => t.id === selectedTaskId);
      if (task) {
        setSelectedTaskId(null);
        setWorkingDir(null);
      }
    }
    await deleteProject(projectId);
  };

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Scanlines */}
      <div className="scanlines" />

      {/* Header */}
      <header className="border-b border-green-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-500 text-glow">
          [ NOVERCODE ]
        </h1>
        <div className="flex items-center gap-2">
          {currentProjectId && (
            <AddTaskDialog
              onAdd={async (title) => {
                const newId = await addTask(title, "");
                setSelectedTaskId(newId);
              }}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project List - Far Left */}
        <div className={`${projectsCollapsed ? "w-10" : "w-48"} border-r border-green-900 flex flex-col transition-[width] duration-150 ease-out`}>
          <div className="h-9 px-2 border-b border-green-900 flex items-center justify-between gap-1">
            {!projectsCollapsed && (
              <>
                <span className="text-xs text-green-700 font-mono">projects</span>
                <AddProjectDialog onAdd={addProject} />
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-green-700 hover:text-green-400 hover:bg-green-900/30"
              onClick={() => setProjectsCollapsed(!projectsCollapsed)}
            >
              {projectsCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {projectsCollapsed ? (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-center p-1.5 rounded cursor-pointer transition-colors ${
                    project.id === currentProjectId
                      ? "bg-green-900/30 text-green-400"
                      : "text-green-700 hover:bg-green-900/20 hover:text-green-500"
                  }`}
                  onClick={() => {
                    setCurrentProjectId(project.id);
                    setSelectedTaskId(null);
                    setWorkingDir(null);
                  }}
                  title={project.name}
                >
                  <Folder className="h-4 w-4" />
                </div>
              ))
            ) : projects.length === 0 ? (
              <div className="text-center py-8 text-green-900 font-mono text-xs">
                <p>no projects</p>
              </div>
            ) : (
              projects.map((project) => (
                <div
                  key={project.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer font-mono text-sm transition-colors ${
                    project.id === currentProjectId
                      ? "bg-green-900/30 text-green-400"
                      : "text-green-700 hover:bg-green-900/20 hover:text-green-500"
                  }`}
                  onClick={() => {
                    setCurrentProjectId(project.id);
                    setSelectedTaskId(null);
                    setWorkingDir(null);
                  }}
                >
                  <Folder className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate flex-1">{project.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-green-900 hover:text-red-500 hover:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Task List - Left */}
        <div className="w-72 border-r border-green-900 flex flex-col">
          <div className="h-9 px-3 border-b border-green-900 flex items-center">
            <span className="text-xs text-green-700 font-mono">
              {currentProject ? `tasks / ${currentProject.name}` : "tasks"}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <div className="space-y-2">
              {!currentProjectId ? (
                <div className="text-center py-12 text-green-900 font-mono text-xs">
                  <p>select a project</p>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-green-800 font-mono">
                  <p>no tasks</p>
                  <p className="text-xs mt-2">click [add task]</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={task.id === selectedTaskId}
                    onDelete={handleDeleteTask}
                    onClick={setSelectedTaskId}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Terminal / Diff - Right */}
        <div className="flex-1 flex flex-col">
          {selectedTaskId && isWorktreeReady ? (
            <>
              {/* Tabs */}
              <div className="h-9 flex items-center px-2 gap-1">
                <button
                  onClick={() => setActiveTab("claude")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                    activeTab === "claude"
                      ? "bg-green-900/40 text-green-400"
                      : "text-green-700 hover:bg-green-900/20 hover:text-green-500"
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  claude
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs transition-colors ${
                    activeTab === "diff"
                      ? "bg-green-900/40 text-green-400"
                      : "text-green-700 hover:bg-green-900/20 hover:text-green-500"
                  }`}
                >
                  <GitCompare className="h-3 w-3" />
                  diff
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === "claude" ? (
                  <CanvasTerminal
                    taskId={selectedTaskId}
                    workingDir={workingDir || undefined}
                  />
                ) : (
                  <DiffView workingDir={workingDir || undefined} />
                )}
              </div>
            </>
          ) : selectedTaskId && !isWorktreeReady ? (
            <div className="flex-1 flex flex-col items-center justify-center text-green-800 font-mono gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              <p>creating worktree...</p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-green-800 font-mono">
              <p>{currentProjectId ? "select a task to start" : "select a project"}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
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
    </div>
  );
}
