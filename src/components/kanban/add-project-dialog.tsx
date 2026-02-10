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
  onAdd: (name: string, path?: string, baseBranch?: string) => void | Promise<string>;
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
  const [baseBranch, setBaseBranch] = useState('main');

  const derivedName = path.trim() ? extractName(path.trim()) : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (derivedName) {
      await onAdd(derivedName, path.trim() || undefined, baseBranch.trim() || undefined);
      setPath('');
      setBaseBranch('main');
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
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="font-mono text-xs text-green-700 hover:text-green-500 hover:bg-green-900/20"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border border-green-900 text-green-500 font-mono">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-green-500">{'// new_project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="path" className="text-green-700 text-xs">
                $ path =
              </Label>
              <div className="flex gap-2">
                <Input
                  id="path"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/path/to/project or git@..."
                  autoFocus
                  className="bg-black border border-green-900 text-green-500 placeholder:text-green-900 focus:border-green-500 font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleSelectFolder}
                  className="border-green-900 text-green-700 hover:text-green-500 hover:bg-green-900/20 bg-transparent"
                  title="Select folder"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {derivedName && (
              <div className="text-xs text-green-700">
                <span className="text-green-900">name: </span>
                <span className="text-green-500">{derivedName}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="baseBranch" className="text-green-700 text-xs">
                $ base_branch =
              </Label>
              <Input
                id="baseBranch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                placeholder="main"
                className="bg-black border border-green-900 text-green-500 placeholder:text-green-900 focus:border-green-500 font-mono"
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
              disabled={!derivedName}
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
