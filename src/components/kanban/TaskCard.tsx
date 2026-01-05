import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Task } from "@/hooks/useKanban";

interface TaskCardProps {
  task: Task;
  selected?: boolean;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}

export function TaskCard({ task, selected, onDelete, onClick }: TaskCardProps) {
  return (
    <Card
      onClick={() => onClick?.(task.id)}
      className={`border cursor-pointer transition-colors ${
        selected
          ? "border-green-500 bg-green-950/40"
          : "border-green-900/50 bg-green-950/20 hover:border-green-500/50 hover:bg-green-950/40"
      }`}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <span className="text-green-800 font-mono text-xs">&gt;</span>
        <CardTitle className="text-sm font-medium flex-1 font-mono text-green-500">
          {task.title}
        </CardTitle>
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
