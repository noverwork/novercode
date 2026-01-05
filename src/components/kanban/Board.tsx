import { useState } from "react";
import { TaskCard } from "./TaskCard";
import { AddTaskDialog } from "./AddTaskDialog";
import { ClaudeTerminal } from "./ClaudeTerminal";
import { useKanban } from "@/hooks/useKanban";

export function Board() {
  const { tasks, addTask, deleteTask } = useKanban();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-black">
      {/* Scanlines */}
      <div className="scanlines" />

      {/* Header */}
      <header className="border-b border-green-900 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-green-500 text-glow">
          [ NOVERCODE ]
        </h1>
        <AddTaskDialog onAdd={addTask} />
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Task List - Left */}
        <div className="w-80 border-r border-green-900 overflow-auto p-4">
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-green-800 font-mono">
                <p>no tasks</p>
                <p className="text-xs mt-2">click [+ NEW]</p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onDelete={deleteTask}
                  onClick={setSelectedTaskId}
                />
              ))
            )}
          </div>
        </div>

        {/* Terminal - Right */}
        <div className="flex-1 flex flex-col">
          {selectedTaskId ? (
            <ClaudeTerminal taskId={selectedTaskId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-green-800 font-mono">
              <p>select a task to start</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <footer className="border-t border-green-900 px-4 py-2 flex items-center justify-between">
        <span className="text-xs text-green-800">
          [ONLINE] | tasks: {tasks.length} | ready
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
