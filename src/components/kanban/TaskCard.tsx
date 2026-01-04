import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Task, Stage } from "@/hooks/useKanban";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  stage: Stage;
}

interface TaskCardPreviewProps {
  task: Task;
}

export function TaskCard({ task, onDelete, onClick, stage }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  const isClickable = stage === "planning" && onClick;

  const handleClick = () => {
    if (isClickable) {
      onClick(task.id);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`border border-green-900/50 bg-green-950/20 cursor-grab active:cursor-grabbing transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${isClickable ? "hover:border-green-500/50 hover:bg-green-950/40" : ""}`}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <span className="text-green-800 font-mono text-xs">::</span>
        <CardTitle className="text-sm font-medium flex-1 font-mono text-green-500">
          {task.title}
        </CardTitle>
        {isClickable && (
          <span className="text-green-900 font-mono text-xs">[AI]</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-800 hover:text-red-500 hover:bg-red-950/20 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardHeader>
      {task.description && (
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-green-700 whitespace-pre-wrap font-mono">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export function TaskCardPreview({ task }: TaskCardPreviewProps) {
  return (
    <Card className="cursor-grabbing border border-green-500 bg-green-950/30">
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <span className="text-green-800 font-mono text-xs">::</span>
        <CardTitle className="text-sm font-medium flex-1 font-mono text-green-400">
          {task.title}
        </CardTitle>
      </CardHeader>
      {task.description && (
        <CardContent className="p-3 pt-0">
          <p className="text-xs text-green-600 whitespace-pre-wrap font-mono">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
