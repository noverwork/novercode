import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CopyProgressStatus = 'in_progress' | 'completed' | 'failed';

type CopyTaskError = {
  code: string;
  message: string;
  task_id: string;
  project_id: string;
  task_path: string | null;
  copied_files: number;
  total_files: number;
};

interface CopyProgressData {
  task_id: string;
  project_id: string;
  progress: number;
  copied_files: number;
  total_files: number;
  status: CopyProgressStatus;
  task_path: string;
  error: CopyTaskError | null;
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
          <DialogTitle className="font-mono uppercase tracking-[0.1em] text-lg">
            Copying Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {progress && (
            <>
              {progress.error ? (
                <div className="font-mono text-sm text-red-400">
                  <span className="text-[rgba(255,255,255,0.5)]">Error:</span>{' '}
                  {progress.error.message}
                </div>
              ) : (
                <>
                  <div className="font-mono text-sm text-[rgba(255,255,255,0.7)]">
                    <span className="text-[rgba(255,255,255,0.5)]">Status:</span>{' '}
                    {progress.status === 'completed' ? 'Completed' : 'Copying...'}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono text-[rgba(255,255,255,0.5)]">
                      <span>Progress</span>
                      <span>{progress.progress}%</span>
                    </div>
                    <div className="h-2 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          progress.status === 'completed' ? 'bg-green-500' : 'bg-[#00FF00]'
                        }`}
                        style={{
                          width: `${progress.progress}%`,
                          boxShadow:
                            progress.status === 'completed'
                              ? 'none'
                              : '0 0 10px rgba(0, 255, 0, 0.5)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="font-mono text-xs text-[rgba(255,255,255,0.5)]">
                    <span className="text-[rgba(255,255,255,0.5)]">Files:</span>{' '}
                    {progress.copied_files} / {progress.total_files}
                  </div>
                </>
              )}
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
