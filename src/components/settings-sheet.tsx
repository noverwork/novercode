import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { Download, RefreshCw, RotateCcw, Settings, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useUpdate } from '@/hooks/useUpdate';

interface Settings {
  claudePath?: string | null;
}

interface SettingsSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsSheet({ open: controlledOpen, onOpenChange }: SettingsSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [settings, setSettings] = useState<Settings>({});
  const [claudePathInput, setClaudePathInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  const { status, updateInfo, downloadProgress, checkUpdate, downloadUpdate, restart } =
    useUpdate();

  // Load settings on mount and when sheet opens
  useEffect(() => {
    if (open) {
      invoke<Settings>('get_settings')
        .then((s) => {
          setSettings(s);
          setClaudePathInput(s.claudePath || '');
        })
        .catch(console.error);
    }
  }, [open]);

  const saveClaudePath = async () => {
    setSaving(true);
    try {
      const updated = await invoke<Settings>('update_settings', {
        claudePath: claudePathInput || null,
      });
      setSettings(updated);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProgressPercent = () => {
    if (!downloadProgress || !downloadProgress.total) return 0;
    return Math.round((downloadProgress.downloaded / downloadProgress.total) * 100);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-[rgba(255,255,255,0.6)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)]"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-[#0a0a0a]">
        <SheetHeader>
          <SheetTitle className="text-[#FFFFFF] font-black uppercase">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Version & Update Section */}
          <div className="space-y-3">
            <h3 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider font-[Helvetica_Neue,Arial,sans-serif]">
              Version
            </h3>
            <div className="p-3 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-[rgba(255,255,255,0.5)]">Current</span>
                <span className="text-sm font-mono text-[rgba(255,255,255,0.8)]">
                  v{currentVersion}
                </span>
              </div>

              {/* Update Status */}
              {status === 'available' && updateInfo && (
                <div className="pt-2 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-[rgba(255,255,255,0.5)]">
                      Available
                    </span>
                    <span className="text-sm font-mono text-[rgba(255,255,255,0.8)]">
                      v{updateInfo.version}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                    onClick={() => downloadUpdate()}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download Update
                  </Button>
                </div>
              )}

              {status === 'downloading' && (
                <div className="pt-2 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[rgba(255,255,255,0.5)]">Downloading...</span>
                    <span className="text-[rgba(255,255,255,0.8)]">
                      {downloadProgress
                        ? `${formatBytes(downloadProgress.downloaded)}${
                            downloadProgress.total
                              ? ` / ${formatBytes(downloadProgress.total)}`
                              : ''
                          }`
                        : '...'}
                    </span>
                  </div>
                  <div className="h-1 bg-[rgba(255,255,255,0.1)] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#00FF00] transition-all duration-300"
                      style={{
                        width: `${getProgressPercent()}%`,
                        boxShadow: '0 0 10px rgba(0,255,0,0.5)',
                      }}
                    />
                  </div>
                </div>
              )}

              {status === 'ready' && (
                <div className="pt-2 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                  <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                    Update ready. Restart to apply.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                    onClick={() => restart()}
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Restart Now
                  </Button>
                </div>
              )}

              {/* Check for Updates Button */}
              {(status === 'idle' || status === 'error') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]"
                  onClick={() => checkUpdate(true)}
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Check for Updates
                </Button>
              )}

              {status === 'checking' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)]"
                  disabled
                >
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Checking...
                </Button>
              )}
            </div>
          </div>

          {/* Claude Section */}
          <div className="space-y-3">
            <h3 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider font-[Helvetica_Neue,Arial,sans-serif]">
              <Terminal className="h-3 w-3 inline mr-1" />
              Claude
            </h3>
            <div className="p-3 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="claude-path"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  Claude Executable Path
                </Label>
                <Input
                  id="claude-path"
                  value={claudePathInput}
                  onChange={(e) => setClaudePathInput(e.target.value)}
                  placeholder="/Users/xxx/.asdf/installs/nodejs/.../bin/claude"
                  className="font-mono text-xs"
                />
                <p className="text-xs font-mono text-[rgba(255,255,255,0.4)]">
                  Leave empty to use PATH. Required for production builds.
                </p>
              </div>
              {claudePathInput !== (settings.claudePath || '') && (
                <Button
                  size="sm"
                  className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                  onClick={saveClaudePath}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Path'}
                </Button>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h3 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider font-[Helvetica_Neue,Arial,sans-serif]">
              About
            </h3>
            <div className="p-3 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-1">
              <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                NOVERCODE - Task-based Development Environment
              </p>
              <p className="text-xs font-mono text-[rgba(255,255,255,0.4)]">
                Built with Tauri + React
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
