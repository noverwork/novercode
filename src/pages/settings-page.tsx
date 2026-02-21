import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Download, Eye, EyeOff, RefreshCw, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdate } from '@/hooks/use-update';

interface Settings {
  llmApiKey?: string | null;
}

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings>({});
  const [llmApiKeyInput, setLlmApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  const { status, updateInfo, downloadProgress, checkUpdate, downloadUpdate, restart } =
    useUpdate();

  useEffect(() => {
    getVersion().then(setCurrentVersion).catch(console.error);
  }, []);

  useEffect(() => {
    invoke<Settings>('get_settings')
      .then((s) => {
        setSettings(s);
        setLlmApiKeyInput(s.llmApiKey || '');
      })
      .catch(console.error);
  }, []);

  const isDirty = llmApiKeyInput !== (settings.llmApiKey || '');

  const saveSettings = async () => {
    if (!isDirty) return;

    setSaving(true);
    try {
      const updated = await invoke<Settings>('update_settings', {
        llmApiKey: llmApiKeyInput || null,
      });
      setSettings(updated);
      setLlmApiKeyInput(updated.llmApiKey || '');
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
    <div className="h-full bg-[#0a0a0a] overflow-auto">
      <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-[rgba(255,255,255,0.15)] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-[rgba(255,255,255,0.8)]" />
          </button>
          <h1 className="text-lg font-bold text-white uppercase tracking-wider">Settings</h1>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <section className="space-y-3">
          <h2 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider">
            OpenAI
          </h2>
          <div className="p-4 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key" className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                API Key
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={llmApiKeyInput}
                  onChange={(e) => setLlmApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="font-mono text-xs pr-10 bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)] hover:text-white"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {isDirty && (
          <div className="sticky bottom-4 pt-4">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="w-full bg-[#00FF00] hover:bg-[#00cc00] text-black font-mono text-xs uppercase tracking-wider"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}

        <section className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.15)]">
          <h2 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider">
            About
          </h2>
          <div className="p-4 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-3">
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-[rgba(255,255,255,0.5)]">Version</span>
              <span className="text-[rgba(255,255,255,0.8)]">v{currentVersion}</span>
            </div>

            {status === 'available' && updateInfo && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                <div className="flex items-center justify-between text-sm font-mono">
                  <span className="text-[rgba(255,255,255,0.5)]">Update Available</span>
                  <span className="text-[#00FF00]">v{updateInfo.version}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => downloadUpdate()}
                  className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                >
                  <Download className="h-3 w-3 mr-2" />
                  Download Update
                </Button>
              </div>
            )}

            {status === 'downloading' && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[rgba(255,255,255,0.5)]">Downloading...</span>
                  <span className="text-[rgba(255,255,255,0.8)]">
                    {downloadProgress
                      ? `${formatBytes(downloadProgress.downloaded)}${
                          downloadProgress.total ? ` / ${formatBytes(downloadProgress.total)}` : ''
                        }`
                      : '...'}
                  </span>
                </div>
                <div className="h-1 bg-[rgba(255,255,255,0.1)] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#00FF00] transition-all"
                    style={{ width: `${getProgressPercent()}%` }}
                  />
                </div>
              </div>
            )}

            {status === 'ready' && (
              <div className="pt-3 border-t border-[rgba(255,255,255,0.15)] space-y-2">
                <p className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                  Update ready. Restart to apply.
                </p>
                <Button
                  size="sm"
                  onClick={() => restart()}
                  className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Restart Now
                </Button>
              </div>
            )}

            {(status === 'idle' || status === 'error') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => checkUpdate(true)}
                className="w-full border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Check for Updates
              </Button>
            )}

            {status === 'checking' && (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="w-full border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)]"
              >
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Checking...
              </Button>
            )}
          </div>
        </section>

        <div className="pt-4 pb-8 text-center">
          <p className="text-xs font-mono text-[rgba(255,255,255,0.4)]">
            NOVERCODE — Task-based Development Environment
          </p>
        </div>
      </div>
    </div>
  );
}
