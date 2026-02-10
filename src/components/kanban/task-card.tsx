import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task } from '@/hooks/useKanban';

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
          ? 'border-[#00FF00] bg-[rgba(0,255,0,0.1)]'
          : 'border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.3)] hover:bg-[rgba(255,255,255,0.05)]'
      }`}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
        <span className="text-[rgba(255,255,255,0.4)] font-mono text-xs">&gt;</span>
        <CardTitle className="text-sm font-medium flex-1 font-mono text-[rgba(255,255,255,0.7)]">
          {task.title}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-[rgba(255,255,255,0.4)] hover:text-[#FF0000] hover:bg-[rgba(255,0,0,0.1)] cursor-pointer"
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
          <p className="text-xs text-[rgba(255,255,255,0.5)] whitespace-pre-wrap font-mono">
            {task.description}
          </p>
        </CardContent>
      )}
    </Card>
  );
}
