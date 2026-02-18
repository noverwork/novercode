import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsPage } from './settings-page';

const mockOnBack = vi.fn();

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

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders settings page with header', async () => {
    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons.find((btn) => btn.querySelector('svg.lucide-arrow-left'));
    expect(backButton).toBeTruthy();
    fireEvent.click(backButton!);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders OpenAI section', async () => {
    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    });
  });

  it('renders Voice Input section', async () => {
    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('Voice Input')).toBeInTheDocument();
      expect(screen.getByText('Microphone Permission')).toBeInTheDocument();
      expect(screen.getByLabelText('Preferred Language')).toBeInTheDocument();
    });
  });

  it('renders About section', async () => {
    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
    });
  });

  it('loads and displays settings', async () => {
    const mockSettings = {
      llmApiKey: 'sk-test-key',
      asrLanguage: 'zh',
    };

    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce(mockSettings);

    render(<SettingsPage onBack={mockOnBack} />);

    const apiKeyInput = await screen.findByDisplayValue('sk-test-key');
    expect(apiKeyInput).toBeInTheDocument();
  });

  it('hides save button when no changes', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({
      llmApiKey: 'sk-test',
    });

    render(<SettingsPage onBack={mockOnBack} />);

    await screen.findByDisplayValue('sk-test');

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('shows save button when API key is modified', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({
      llmApiKey: 'sk-test',
    });

    render(<SettingsPage onBack={mockOnBack} />);

    const input = await screen.findByDisplayValue('sk-test');
    fireEvent.change(input, { target: { value: 'sk-new' } });

    expect(await screen.findByText('Save Changes')).not.toBeDisabled();
  });

  it('shows save button when language is changed', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({});

    render(<SettingsPage onBack={mockOnBack} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Preferred Language')).toBeInTheDocument();
    });

    const select = screen.getByLabelText('Preferred Language');
    fireEvent.change(select, { target: { value: 'zh' } });

    expect(await screen.findByText('Save Changes')).not.toBeDisabled();
  });

  it('API key field is masked by default', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({});

    render(<SettingsPage onBack={mockOnBack} />);

    const apiKeyInput = await screen.findByPlaceholderText('sk-...');
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('API key visibility toggle works', async () => {
    vi.mocked((await import('@tauri-apps/api/core')).invoke).mockResolvedValueOnce({});

    render(<SettingsPage onBack={mockOnBack} />);

    const apiKeyInput = await screen.findByPlaceholderText('sk-...');
    const toggleButton = apiKeyInput.parentElement?.querySelector('button');

    expect(apiKeyInput).toHaveAttribute('type', 'password');

    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'text');

      fireEvent.click(toggleButton);
      expect(apiKeyInput).toHaveAttribute('type', 'password');
    }
  });
});
