import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock xterm BEFORE importing anything that uses it
vi.mock('xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: vi.fn(),
    loadAddon: vi.fn(),
    onData: vi.fn(() => ({ dispose: vi.fn() })),
    focus: vi.fn(),
    write: vi.fn(),
    cols: 80,
    rows: 24,
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

// Use the standard vi.mock pattern with vi.fn() inside
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

// Import AFTER all mocks are defined
import { invoke } from '@tauri-apps/api/core';

import { terminalSessionManager } from './terminal-session-manager';

// Get the mocked function
const mockInvoke = vi.mocked(invoke);

describe('TerminalSessionManager.insertText', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('sends text bytes via terminal_write with exact text (no trailing newline)', async () => {
    const testSessionId = 'test-session-1';
    const testText = 'echo hello';

    // Create a minimal mock session entry
    const mockSession = {
      terminal: { focus: vi.fn() },
      fitAddon: { fit: vi.fn() },
      dataDisposable: { dispose: vi.fn() },
      unlistenOutput: vi.fn(),
      container: null,
      sessionReady: true,
      lastReportedSize: { cols: 80, rows: 24 },
      mouseHandlers: null,
    };

    // @ts-expect-error - accessing private for testing
    terminalSessionManager.sessions.set(testSessionId, mockSession);

    await terminalSessionManager.insertText(testSessionId, testText);

    const expectedBytes = [101, 99, 104, 111, 32, 104, 101, 108, 108, 111];
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('terminal_write', {
      id: testSessionId,
      data: expectedBytes,
    });

    // @ts-expect-error - accessing private for testing
    terminalSessionManager.sessions.delete(testSessionId);
  });

  it('gracefully handles missing session (no throw)', async () => {
    await expect(
      terminalSessionManager.insertText('nonexistent', 'some text')
    ).resolves.not.toThrow();

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('handles multi-byte characters correctly', async () => {
    const testSessionId = 'multi-byte-session';
    const testText = '你好世界';

    const mockSession = {
      terminal: { focus: vi.fn() },
      fitAddon: { fit: vi.fn() },
      dataDisposable: { dispose: vi.fn() },
      unlistenOutput: vi.fn(),
      container: null,
      sessionReady: true,
      lastReportedSize: { cols: 80, rows: 24 },
      mouseHandlers: null,
    };

    // @ts-expect-error - accessing private for testing
    terminalSessionManager.sessions.set(testSessionId, mockSession);

    await terminalSessionManager.insertText(testSessionId, testText);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const calls = mockInvoke.mock.calls;
    expect(calls.length).toBe(1);
    const callArgs = calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs?.[1]).toHaveProperty('data');
    const data = (callArgs?.[1] as { data: unknown })?.data;
    expect(Array.isArray(data)).toBe(true);
    expect((data as unknown[]).length).toBeGreaterThan(0);

    // @ts-expect-error - accessing private for testing
    terminalSessionManager.sessions.delete(testSessionId);
  });
});
