import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CopyProgressData {
  project_name: string;
  progress: number;
  copied_files: number;
  total_files: number;
}

interface ProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  progress?: CopyProgressData;
}

export function ProgressDialog({ open, onOpenChange, progress }: ProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0a0a0a] border-[rgba(255,255,255,0.15)] text-[#FFFFFF] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="font-mono uppercase tracking-[0.1em] text-lg">Copying Project</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[rgba(255,255,255,0.5)] hover:text-[#FFFFFF]"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {progress && (
            <>
              <div className="font-mono text-sm text-[rgba(255,255,255,0.7)]">
                <span className="text-[rgba(255,255,255,0.5)]">Project:</span>{' '}
                {progress.project_name}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-[rgba(255,255,255,0.5)]">
                  <span>Progress</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00FF00] transition-all duration-300"
                    style={{
                      width: `${progress.progress}%`,
                      boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
                    }}
                  />
                </div>
              </div>

              <div className="font-mono text-xs text-[rgba(255,255,255,0.5)]">
                <span className="text-[rgba(255,255,255,0.5)]">Files:</span> {progress.copied_files}{' '}
                / {progress.total_files}
              </div>
            </>
          )}

          {!progress && (
            <div className="flex items-center justify-center py-8 text-[rgba(255,255,255,0.5)] font-mono">
              <div className="h-6 w-6 border-2 border-[#00FF00] border-t-transparent rounded-full animate-spin mr-3" />
              <span>Starting copy...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
