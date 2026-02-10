import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddTaskDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAdd: (title: string) => void | Promise<void> | Promise<string>;
}

export function AddTaskDialog({ open: controlledOpen, onOpenChange, onAdd }: AddTaskDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && !isLoading) {
      setIsLoading(true);
      try {
        await onAdd(title.trim());
        setTitle('');
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isLoading && setOpen(v)}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="font-mono text-sm border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20"
        >
          <Plus className="h-4 w-4 mr-1" />
          [add task]
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border border-green-900 text-green-500 font-mono">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-green-500">{'// new_task'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-green-700 text-xs">
                $ title =
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="enter task title..."
                autoFocus
                disabled={isLoading}
                className="bg-black border border-green-900 text-green-500 placeholder:text-green-900 focus:border-green-500 font-mono disabled:opacity-50"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="font-mono text-sm border border-green-900 text-green-700 hover:bg-green-900/20 hover:text-green-600 bg-transparent disabled:opacity-50"
            >
              [cancel]
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="font-mono text-sm border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  [creating...]
                </>
              ) : (
                '[create]'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
