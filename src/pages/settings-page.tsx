import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Download, Eye, EyeOff, Keyboard, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
} from 'tauri-plugin-macos-permissions-api';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdate } from '@/hooks/use-update';

interface Settings {
  llmApiKey?: string | null;
  asrLanguage?: string | null;
  asrShortcut?: string | null;
}

const LANGUAGES = [
  { value: '', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
];

type MicPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

interface SettingsPageProps {
  onBack: () => void;
}

const IS_MACOS = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<Settings>({});
  const [llmApiKeyInput, setLlmApiKeyInput] = useState('');
  const [asrLanguageInput, setAsrLanguageInput] = useState('');
  const [asrShortcutInput, setAsrShortcutInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [micPermission, setMicPermission] = useState<MicPermissionState>('unknown');
  const [accessibilityGranted, setAccessibilityGranted] = useState<boolean | null>(null);
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const shortcutInputRef = useRef<HTMLInputElement>(null);

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
        setAsrLanguageInput(s.asrLanguage || '');
        setAsrShortcutInput(s.asrShortcut || 'Alt+Space');
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    checkMicPermission();
    if (IS_MACOS) {
      checkAccessibility();
    }
  }, []);

  const checkAccessibility = async () => {
    try {
      const granted = await checkAccessibilityPermission();
      setAccessibilityGranted(granted);
    } catch {
      setAccessibilityGranted(null);
    }
  };

  const handleRequestAccessibility = async () => {
    await requestAccessibilityPermission();
    setTimeout(checkAccessibility, 1000);
  };

  const checkMicPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(result.state);
      result.onchange = () => setMicPermission(result.state);
    } catch {
      setMicPermission('unknown');
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicPermission('granted');
    } catch {
      setMicPermission('denied');
    }
  };

  const formatKeyForTauri = useCallback((e: KeyboardEvent): string => {
    const parts: string[] = [];

    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push(IS_MACOS ? 'Option' : 'Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push(IS_MACOS ? 'Command' : 'Super');

    let key = e.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Escape') key = 'Escape';
    else if (key === 'Enter') key = 'Return';
    else if (key === 'Tab') key = 'Tab';
    else if (key === 'Backspace') key = 'Backspace';
    else if (key === 'Delete') key = 'Delete';
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key.length === 1) key = key.toUpperCase();

    if (!['Control', 'Alt', 'Shift', 'Meta', 'Option', 'Command'].includes(key)) {
      parts.push(key);
    }

    return parts.join('+');
  }, []);

  const handleShortcutKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isRecordingShortcut) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setIsRecordingShortcut(false);
        return;
      }

      if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') {
        return;
      }

      const shortcut = formatKeyForTauri(e.nativeEvent);
      if (shortcut && shortcut.includes('+')) {
        setAsrShortcutInput(shortcut);
        setIsRecordingShortcut(false);
      }
    },
    [isRecordingShortcut, formatKeyForTauri]
  );

  const startRecordingShortcut = useCallback(() => {
    setIsRecordingShortcut(true);
    shortcutInputRef.current?.focus();
  }, []);

  const isDirty =
    llmApiKeyInput !== (settings.llmApiKey || '') ||
    asrLanguageInput !== (settings.asrLanguage || '') ||
    asrShortcutInput !== (settings.asrShortcut || 'Alt+Space');

  const saveSettings = async () => {
    if (!isDirty) return;

    setSaving(true);
    try {
      const updated = await invoke<Settings>('update_settings', {
        llmApiKey: llmApiKeyInput || null,
        asrLanguage: asrLanguageInput || null,
        asrShortcut: asrShortcutInput || null,
      });
      setSettings(updated);
      setLlmApiKeyInput(updated.llmApiKey || '');
      setAsrLanguageInput(updated.asrLanguage || '');
      setAsrShortcutInput(updated.asrShortcut || 'Alt+Space');
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

  const getMicStatusDisplay = () => {
    switch (micPermission) {
      case 'granted':
        return { text: 'Granted', color: 'text-green-400' };
      case 'denied':
        return { text: 'Denied', color: 'text-red-400' };
      case 'prompt':
        return { text: 'Not Requested', color: 'text-yellow-400' };
      default:
        return { text: 'Unknown', color: 'text-gray-400' };
    }
  };

  const micStatus = getMicStatusDisplay();

  return (
    <div className="h-full bg-[#0a0a0a] overflow-auto">
      {/* Header */}
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

      {/* Content */}
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* OpenAI Section */}
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

        <section className="space-y-3">
          <h2 className="text-xs text-[rgba(255,255,255,0.6)] font-mono uppercase tracking-wider">
            Voice Input
          </h2>
          <div className="p-4 rounded border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.02)] space-y-4">
            {IS_MACOS && (
              <div className="space-y-2">
                <Label className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                  Accessibility Permission
                </Label>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-mono ${
                      accessibilityGranted === true
                        ? 'text-green-400'
                        : accessibilityGranted === false
                          ? 'text-red-400'
                          : 'text-gray-400'
                    }`}
                  >
                    {accessibilityGranted === true
                      ? 'Granted'
                      : accessibilityGranted === false
                        ? 'Required'
                        : 'Checking...'}
                  </span>
                  {accessibilityGranted === false && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRequestAccessibility}
                      className="text-xs font-mono border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)] hover:text-white"
                    >
                      Open Settings
                    </Button>
                  )}
                </div>
                {accessibilityGranted === false && (
                  <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                    Global shortcuts require Accessibility permission. Enable it in System Settings
                    → Privacy & Security → Accessibility.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                Microphone Permission
              </Label>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-mono ${micStatus.color}`}>{micStatus.text}</span>
                {micPermission !== 'granted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={requestMicPermission}
                    className="text-xs font-mono border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)] hover:text-white"
                  >
                    Request Permission
                  </Button>
                )}
              </div>
              {micPermission === 'denied' && (
                <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
                  Permission denied. Please enable microphone access in your system settings.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-xs font-mono text-[rgba(255,255,255,0.5)]">
                Preferred Language
              </Label>
              <select
                id="language"
                value={asrLanguageInput}
                onChange={(e) => setAsrLanguageInput(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.2)] rounded text-white focus:outline-none focus:border-[#00FF00]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">
                Helps improve transcription accuracy
              </p>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="asr-shortcut"
                className="text-xs font-mono text-[rgba(255,255,255,0.5)]"
              >
                Voice Input Shortcut
              </Label>
              <div className="flex gap-2">
                <input
                  ref={shortcutInputRef}
                  id="asr-shortcut"
                  value={isRecordingShortcut ? 'Press shortcut...' : asrShortcutInput || 'Not set'}
                  readOnly
                  onKeyDown={handleShortcutKeyDown}
                  onBlur={() => setIsRecordingShortcut(false)}
                  className={`flex-1 px-3 py-2 text-xs font-mono rounded cursor-pointer ${
                    isRecordingShortcut
                      ? 'bg-[#00FF00]/10 border-[#00FF00] text-[#00FF00]'
                      : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.2)] text-white'
                  } border focus:outline-none`}
                  placeholder="Click to record..."
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startRecordingShortcut}
                  className="text-xs font-mono border-[rgba(255,255,255,0.3)] text-[rgba(255,255,255,0.6)] hover:text-white"
                >
                  <Keyboard className="h-3 w-3 mr-1" />
                  Record
                </Button>
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">
                Click Record then press your shortcut. Hold to record voice, release to transcribe.
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
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

        {/* About Section */}
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

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <p className="text-xs font-mono text-[rgba(255,255,255,0.4)]">
            NOVERCODE — Task-based Development Environment
          </p>
        </div>
      </div>
    </div>
  );
}
