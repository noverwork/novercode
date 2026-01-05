import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface AddTaskDialogProps {
  onAdd: (title: string, description: string) => void | Promise<void> | Promise<string>;
}

export function AddTaskDialog({ onAdd }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      await onAdd(title.trim(), description.trim());
      setTitle("");
      setDescription("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            <DialogTitle className="text-green-500">
              // new_task
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                className="bg-black border border-green-900 text-green-500 placeholder:text-green-900 focus:border-green-500 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-green-700 text-xs">
                $ description =
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="enter task description..."
                rows={3}
                className="bg-black border border-green-900 text-green-500 placeholder:text-green-900 focus:border-green-500 font-mono resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="font-mono text-sm border border-green-900 text-green-700 hover:bg-green-900/20 hover:text-green-600 bg-transparent"
            >
              [cancel]
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="font-mono text-sm border border-green-700 text-green-500 hover:bg-green-900/30 hover:text-green-400 bg-green-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              [create]
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
