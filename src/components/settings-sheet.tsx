import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { Download, Eye, EyeOff, RefreshCw, RotateCcw, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useUpdate } from '@/hooks/use-update';

interface Settings {
  llmApiKey?: string | null;
  llmBaseUrl?: string | null;
  llmModel?: string | null;
  asrModel?: string | null;
  asrLanguage?: string | null;
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
  const [llmApiKeyInput, setLlmApiKeyInput] = useState('');
  const [llmBaseUrlInput, setLlmBaseUrlInput] = useState('');
  const [llmModelInput, setLlmModelInput] = useState('');
  const [asrModelInput, setAsrModelInput] = useState('');
  const [asrLanguageInput, setAsrLanguageInput] = useState('');
  const [showLlmApiKey, setShowLlmApiKey] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
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
          setLlmApiKeyInput(s.llmApiKey || '');
          setLlmBaseUrlInput(s.llmBaseUrl || '');
          setLlmModelInput(s.llmModel || '');
          setAsrModelInput(s.asrModel || '');
          setAsrLanguageInput(s.asrLanguage || '');
        })
        .catch(console.error);
    }
  }, [open]);

  const aiDirty =
    llmApiKeyInput !== (settings.llmApiKey || '') ||
    llmBaseUrlInput !== (settings.llmBaseUrl || '') ||
    llmModelInput !== (settings.llmModel || '') ||
    asrModelInput !== (settings.asrModel || '') ||
    asrLanguageInput !== (settings.asrLanguage || '');

  const saveAiSettings = async () => {
    const payload: Record<string, string | null> = {};

    if (llmApiKeyInput !== (settings.llmApiKey || '')) {
      payload.llmApiKey = llmApiKeyInput || null;
    }
    if (llmBaseUrlInput !== (settings.llmBaseUrl || '')) {
      payload.llmBaseUrl = llmBaseUrlInput || null;
    }
    if (llmModelInput !== (settings.llmModel || '')) {
      payload.llmModel = llmModelInput || null;
    }
    if (asrModelInput !== (settings.asrModel || '')) {
      payload.asrModel = asrModelInput || null;
    }
    if (asrLanguageInput !== (settings.asrLanguage || '')) {
      payload.asrLanguage = asrLanguageInput || null;
    }

    if (Object.keys(payload).length === 0) {
      return;
    }

    setSavingAi(true);
    try {
      const updated = await invoke<Settings>('update_settings', payload);
      setSettings(updated);
      setLlmApiKeyInput(updated.llmApiKey || '');
      setLlmBaseUrlInput(updated.llmBaseUrl || '');
      setLlmModelInput(updated.llmModel || '');
      setAsrModelInput(updated.asrModel || '');
      setAsrLanguageInput(updated.asrLanguage || '');
    } catch (err) {
      console.error('Failed to save AI settings:', err);
    } finally {
      setSavingAi(false);
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

          <div className="space-y-3">
            <h3 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider font-[Helvetica_Neue,Arial,sans-serif]">
              OpenAI
            </h3>
            <div className="p-3 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="llm-api-key"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  API Key
                </Label>
                <div className="relative">
                  <Input
                    id="llm-api-key"
                    name="llmApiKey"
                    type={showLlmApiKey ? 'text' : 'password'}
                    value={llmApiKeyInput}
                    onChange={(e) => setLlmApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    data-testid="toggle-llm-api-key-visibility"
                    aria-label={showLlmApiKey ? 'Hide API key' : 'Show API key'}
                    onClick={() => setShowLlmApiKey((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.5)] hover:text-[#FFFFFF]"
                  >
                    {showLlmApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="llm-base-url"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  Base URL
                </Label>
                <Input
                  id="llm-base-url"
                  name="llmBaseUrl"
                  value={llmBaseUrlInput}
                  onChange={(e) => setLlmBaseUrlInput(e.target.value)}
                  placeholder="https://api.openai.com"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="llm-model"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  Model
                </Label>
                <Input
                  id="llm-model"
                  name="llmModel"
                  value={llmModelInput}
                  onChange={(e) => setLlmModelInput(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider font-[Helvetica_Neue,Arial,sans-serif]">
              ASR
            </h3>
            <div className="p-3 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="asr-model"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  Model
                </Label>
                <Input
                  id="asr-model"
                  name="asrModel"
                  value={asrModelInput}
                  onChange={(e) => setAsrModelInput(e.target.value)}
                  placeholder="whisper-1"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="asr-language"
                  className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
                >
                  Language
                </Label>
                <Input
                  id="asr-language"
                  name="asrLanguage"
                  value={asrLanguageInput}
                  onChange={(e) => setAsrLanguageInput(e.target.value)}
                  placeholder="zh"
                  className="font-mono text-xs"
                />
              </div>

              {aiDirty && (
                <Button
                  size="sm"
                  className="w-full bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.8)] border border-[rgba(255,255,255,0.3)]"
                  onClick={saveAiSettings}
                  disabled={savingAi}
                >
                  {savingAi ? 'Saving...' : 'Save AI Settings'}
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
