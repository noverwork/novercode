import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddProjectDialog } from "./AddProjectDialog";
import { ClaudeTerminal, killPty } from "./ClaudeTerminal";
import { useKanban } from "@/hooks/useKanban";
import { Folder, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  // 刪除 project 時也要 kill 相關的 PTY
  const handleDeleteProject = async (projectId: string) => {
    const projectTasks = getTasksByProject(projectId);
    projectTasks.forEach((t) => killPty(t.id));
    if (selectedTaskId) {
      const task = projectTasks.find((t) => t.id === selectedTaskId);
      if (task) {
        setSelectedTaskId(null);
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
              onAdd={async (title, description) => {
                const newId = await addTask(title, description);
                setSelectedTaskId(newId);
              }}
            />
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Project List - Far Left */}
        <div className="w-48 border-r border-green-900 flex flex-col">
          <div className="h-9 px-3 border-b border-green-900 flex items-center justify-between">
            <span className="text-xs text-green-700 font-mono">projects</span>
            <AddProjectDialog onAdd={addProject} />
          </div>
          <div className="flex-1 overflow-auto p-2 space-y-1">
            {projects.length === 0 ? (
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
                    onDelete={async (id) => {
                      killPty(id);
                      if (selectedTaskId === id) {
                        setSelectedTaskId(null);
                      }
                      await deleteTask(id);
                    }}
                    onClick={setSelectedTaskId}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Terminal - Right */}
        <div className="flex-1 flex flex-col">
          {selectedTaskId ? (
            <ClaudeTerminal
              taskId={selectedTaskId}
              workingDir={currentProject?.path}
            />
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
