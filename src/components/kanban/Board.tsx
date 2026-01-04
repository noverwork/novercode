import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Column } from "./Column";
import { TaskCardPreview } from "./TaskCard";
import { AddTaskDialog } from "./AddTaskDialog";
import { useKanban } from "@/hooks/useKanban";

export function Board() {
  const { tasks, addTask, deleteTask, moveTask, getTasksByStage, stages } =
    useKanban();
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeId) || null,
    [tasks, activeId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStage = over.id as typeof stages[number];

    moveTask(taskId, newStage);
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
        <AddTaskDialog onAdd={addTask} />
      </header>

      {/* Main Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {stages.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                tasks={getTasksByStage(stage)}
                onDeleteTask={deleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask && (
              <div className="opacity-90 cursor-grabbing">
                <TaskCardPreview task={activeTask} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
