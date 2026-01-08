import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { Download, RefreshCw, RotateCcw, Settings, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useUpdate } from "@/hooks/useUpdate";

interface Settings {
  claudePath?: string | null;
}

export function SettingsSheet() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({});
  const [claudePathInput, setClaudePathInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  const {
    status,
    updateInfo,
    downloadProgress,
    checkUpdate,
    downloadUpdate,
    restart,
  } = useUpdate();

  // Load settings on mount and when sheet opens
  useEffect(() => {
    if (open) {
      invoke<Settings>("get_settings")
        .then((s) => {
          setSettings(s);
          setClaudePathInput(s.claudePath || "");
        })
        .catch(console.error);
    }
  }, [open]);

  const saveClaudePath = async () => {
    setSaving(true);
    try {
      const updated = await invoke<Settings>("update_settings", {
        claudePath: claudePathInput || null,
      });
      setSettings(updated);
    } catch (err) {
      console.error("Failed to save settings:", err);
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
          className="h-7 w-7 text-green-700 hover:text-green-400 hover:bg-green-900/30"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-black border-green-900 text-green-500">
        <SheetHeader>
          <SheetTitle className="text-green-500 font-mono">[ SETTINGS ]</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Version & Update Section */}
          <div className="space-y-3">
            <h3 className="text-xs text-green-700 font-mono uppercase tracking-wider">
              Version
            </h3>
            <div className="p-3 rounded border border-green-900 bg-green-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono text-green-600">Current</span>
                <span className="text-sm font-mono text-green-400">v{currentVersion}</span>
              </div>

              {/* Update Status */}
              {status === "available" && updateInfo && (
                <div className="pt-2 border-t border-green-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-green-600">Available</span>
                    <span className="text-sm font-mono text-green-400">
                      v{updateInfo.version}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-green-900/50 hover:bg-green-800/50 text-green-400 border border-green-700"
                    onClick={() => downloadUpdate()}
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Download Update
                  </Button>
                </div>
              )}

              {status === "downloading" && (
                <div className="pt-2 border-t border-green-900 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-green-600">Downloading...</span>
                    <span className="text-green-400">
                      {downloadProgress
                        ? `${formatBytes(downloadProgress.downloaded)}${
                            downloadProgress.total
                              ? ` / ${formatBytes(downloadProgress.total)}`
                              : ""
                          }`
                        : "..."}
                    </span>
                  </div>
                  <div className="h-1 bg-green-950 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${getProgressPercent()}%` }}
                    />
                  </div>
                </div>
              )}

              {status === "ready" && (
                <div className="pt-2 border-t border-green-900 space-y-2">
                  <p className="text-xs font-mono text-green-600">
                    Update ready. Restart to apply.
                  </p>
                  <Button
                    size="sm"
                    className="w-full bg-green-900/50 hover:bg-green-800/50 text-green-400 border border-green-700"
                    onClick={() => restart()}
                  >
                    <RotateCcw className="h-3 w-3 mr-2" />
                    Restart Now
                  </Button>
                </div>
              )}

              {/* Check for Updates Button */}
              {(status === "idle" || status === "error") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-green-900 text-green-600 hover:bg-green-900/30 hover:text-green-400"
                  onClick={() => checkUpdate(true)}
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Check for Updates
                </Button>
              )}

              {status === "checking" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full border-green-900 text-green-600"
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
            <h3 className="text-xs text-green-700 font-mono uppercase tracking-wider">
              <Terminal className="h-3 w-3 inline mr-1" />
              Claude
            </h3>
            <div className="p-3 rounded border border-green-900 bg-green-950/20 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="claude-path" className="text-xs font-mono text-green-600">
                  Claude Executable Path
                </Label>
                <Input
                  id="claude-path"
                  value={claudePathInput}
                  onChange={(e) => setClaudePathInput(e.target.value)}
                  placeholder="/Users/xxx/.asdf/installs/nodejs/.../bin/claude"
                  className="font-mono text-xs bg-black border-green-900 text-green-400 placeholder:text-green-900"
                />
                <p className="text-xs font-mono text-green-800">
                  Leave empty to use PATH. Required for production builds.
                </p>
              </div>
              {(claudePathInput !== (settings.claudePath || "")) && (
                <Button
                  size="sm"
                  className="w-full bg-green-900/50 hover:bg-green-800/50 text-green-400 border border-green-700"
                  onClick={saveClaudePath}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Path"}
                </Button>
              )}
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-3">
            <h3 className="text-xs text-green-700 font-mono uppercase tracking-wider">
              About
            </h3>
            <div className="p-3 rounded border border-green-900 bg-green-950/20 space-y-1">
              <p className="text-xs font-mono text-green-600">
                NOVERCODE - Task-based Development Environment
              </p>
              <p className="text-xs font-mono text-green-800">
                Built with Tauri + React
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
