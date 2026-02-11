import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { FolderOpen, FolderPlus } from 'lucide-react';
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

interface AddProjectDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAdd: (name: string, path?: string) => void | Promise<string>;
}

function extractName(path: string): string {
  const gitMatch = path.match(/\/([^/]+?)(\.git)?$/);
  if (gitMatch) {
    return gitMatch[1];
  }
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/);
  return parts[parts.length - 1] || path;
}

export function AddProjectDialog({
  open: controlledOpen,
  onOpenChange,
  onAdd,
}: AddProjectDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [path, setPath] = useState('');

  const derivedName = path.trim() ? extractName(path.trim()) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (derivedName) {
      await onAdd(derivedName, path.trim() || undefined);
      setPath('');
      setOpen(false);
    }
  };

  const handleSelectFolder = async () => {
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: 'Select Project Folder',
    });
    if (selected && typeof selected === 'string') {
      setPath(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="font-mono text-xs uppercase tracking-[0.15em] text-[rgba(255,255,255,0.6)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[#0a0a0a] border border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] font-mono">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[#FFFFFF] font-black uppercase">New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path" className="text-[rgba(255,255,255,0.6)] text-xs">
                $ path =
              </Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/path/to/project or git@..."
                  autoFocus
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSelectFolder}
                  className="text-[rgba(255,255,255,0.6)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)] bg-transparent"
                  title="Select folder"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {derivedName && (
              <div className="text-xs text-[rgba(255,255,255,0.6)]">
                <span className="text-[rgba(255,255,255,0.4)]">name: </span>
                <span className="text-[rgba(255,255,255,0.8)]">{derivedName}</span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="font-mono text-xs uppercase tracking-[0.15em]"
            >
              [cancel]
            </Button>
            <Button
              type="submit"
              disabled={!derivedName}
              className="font-mono text-xs uppercase tracking-[0.15em]"
            >
              [create]
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
