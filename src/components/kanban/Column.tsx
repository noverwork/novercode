import { useDroppable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskCard } from "./TaskCard";
import type { Task, Stage } from "@/hooks/useKanban";

const STAGE_LABELS: Record<Stage, string> = {
  planning: "planning",
  implementation: "implementation",
  review: "review",
  done: "done",
};

interface ColumnProps {
  stage: Stage;
  tasks: Task[];
  onDeleteTask: (id: string) => void;
  onTaskClick?: (id: string) => void;
}

export function Column({ stage, tasks, onDeleteTask, onTaskClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 flex-shrink-0 border border-green-900 bg-black ${
        isOver ? "ring-2 ring-green-500" : ""
      }`}
    >
      {/* Header */}
      <div className="border-b border-green-900 px-3 py-2 flex justify-between items-center">
        <span className="font-mono text-sm text-green-600">
          &lt;{STAGE_LABELS[stage]}/&gt;
        </span>
        <span className="font-mono text-xs text-green-800">
          [{tasks.length}]
        </span>
      </div>

      {/* Tasks */}
      <ScrollArea className="flex-1 h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-2 p-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDelete={onDeleteTask}
              onClick={onTaskClick}
              stage={stage}
            />
          ))}
          {tasks.length === 0 && (
            <p className="text-xs text-green-900 text-center py-4 font-mono">
              $ empty
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
