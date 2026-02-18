import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsSheet } from './settings-sheet';

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(() => Promise.resolve('1.0.0')),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/hooks/use-update', () => ({
  useUpdate: vi.fn(() => ({
    status: 'idle' as const,
    updateInfo: null,
    downloadProgress: null,
    checkUpdate: vi.fn(),
    downloadUpdate: vi.fn(),
    restart: vi.fn(),
  })),
}));

describe('SettingsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders settings sheet with existing settings', async () => {
    const mockVersion = '1.0.0';
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };

    const { getVersion } = await import('@tauri-apps/api/app');

    vi.mocked(getVersion).mockResolvedValueOnce(mockVersion);
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsSheet open={true} />);

    await waitFor(() => {
      expect(screen.getByText(/Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/v1\.0\.0/i)).toBeInTheDocument();
    });
  });

  it('loads settings on sheet open', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };

    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsSheet open={true} />);

    const apiKeyInput = await screen.findByDisplayValue('sk-test-key');
    expect(apiKeyInput).toBeInTheDocument();
  });

  it('hides save button when no changes', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };

    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsSheet open={true} />);

    await screen.findByDisplayValue('sk-test-key');

    expect(screen.queryByText(/Save/i)).not.toBeInTheDocument();
  });

  it('shows save button when API key is modified', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };

    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsSheet open={true} />);

    const input = await screen.findByDisplayValue('sk-test-key');

    fireEvent.change(input, { target: { value: 'sk-new-key' } });

    const saveButton = await screen.findByText(/Save$/i);
    expect(saveButton).not.toBeDisabled();
  });

  it('hides save button when field is reverted', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };

    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsSheet open={true} />);

    const input = await screen.findByDisplayValue('sk-test-key');

    fireEvent.change(input, { target: { value: 'sk-new-key' } });

    await screen.findByText(/Save$/i);

    fireEvent.change(input, { target: { value: 'sk-test-key' } });

    await waitFor(() => {
      expect(screen.queryByText(/Save$/i)).not.toBeInTheDocument();
    });
  });

  it('saves payload with llmApiKey value', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };
    const updatedKey = 'sk-new-key';

    vi.mocked((await import('@tauri-apps/api/core')).invoke)
      .mockResolvedValueOnce(mockSettings)
      .mockResolvedValueOnce({ llmApiKey: updatedKey });

    render(<SettingsSheet open={true} />);

    const input = await screen.findByDisplayValue('sk-test-key');

    fireEvent.change(input, { target: { value: updatedKey } });

    const saveButton = await screen.findByText(/Save$/i);
    fireEvent.click(saveButton);

    const invoke = (await import('@tauri-apps/api/core')).invoke;
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenNthCalledWith(2, 'update_settings', { llmApiKey: updatedKey });
    });
  });

  it('sets saving state during save operation', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
    };
    const { invoke } = await import('@tauri-apps/api/core');

    vi.mocked(invoke)
      .mockResolvedValueOnce(mockSettings)
      .mockImplementation(() => new Promise(() => {}));

    render(<SettingsSheet open={true} />);

    const input = await screen.findByDisplayValue('sk-test-key');

    fireEvent.change(input, { target: { value: 'sk-new-key' } });

    const saveButton = await screen.findByText(/Save$/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Saving\.\.\./i)).toBeInTheDocument();
    });
  });

  it('API key field is masked by default', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({});

    render(<SettingsSheet open={true} />);

    const apiKeyInput = await screen.findByPlaceholderText('sk-...');
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('API key visibility toggle works', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({});

    render(<SettingsSheet open={true} />);

    const apiKeyInput = await screen.findByPlaceholderText('sk-...');
    const toggleButton = screen.getByTestId('toggle-llm-api-key-visibility');

    expect(apiKeyInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(apiKeyInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });
});
