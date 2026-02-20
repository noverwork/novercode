import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from 'xterm';

const textEncoder = new TextEncoder();
const TERMINAL_SCROLLBACK_LIMIT = 5000;
const MAX_RETAINED_TERMINAL_SESSIONS = 20;

interface TerminalOutputPayload {
  data: string;
}

export interface TerminalSessionOptions {
  workingDir?: string;
  terminalOptions?: ConstructorParameters<typeof Terminal>[0];
  customKeyHandler?: (event: KeyboardEvent) => boolean;
}

interface TerminalSessionRecord {
  terminal: Terminal;
  fitAddon: FitAddon;
  dataDisposable: ReturnType<Terminal['onData']>;
  unlistenOutput: UnlistenFn | null;
  container: HTMLDivElement | null;
  workingDir?: string;
  sessionReady: boolean;
  lastReportedSize: {
    cols: number;
    rows: number;
  };
  mouseHandlers: {
    mousedown: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
  } | null;
  customKeyHandler?: (event: KeyboardEvent) => boolean;
}

function decodeBase64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

class TerminalSessionManager {
  private sessions = new Map<string, TerminalSessionRecord>();
  private lruOrder: string[] = [];

  async getOrCreateTerminal(
    sessionId: string,
    container: HTMLDivElement,
    options: TerminalSessionOptions = {}
  ): Promise<Terminal> {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.workingDir = options.workingDir;
      this.touchLru(sessionId);
      this.attachToContainer(sessionId, container);
      await this.fitAndResize(sessionId);
      return existing.terminal;
    }

    const terminal = new Terminal({
      ...options.terminalOptions,
      scrollback: TERMINAL_SCROLLBACK_LIMIT,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    if (options.customKeyHandler) {
      terminal.attachCustomKeyEventHandler(options.customKeyHandler);
    }

    const session: TerminalSessionRecord = {
      terminal,
      fitAddon,
      container,
      workingDir: options.workingDir,
      sessionReady: false,
      unlistenOutput: null,
      customKeyHandler: options.customKeyHandler,
      dataDisposable: terminal.onData((data) => {
        const bytes = Array.from(textEncoder.encode(data));
        void invoke('terminal_write', { id: sessionId, data: bytes }).catch((error) => {
          console.error('Failed to write to terminal:', error);
        });
      }),
      lastReportedSize: {
        cols: terminal.cols,
        rows: terminal.rows,
      },
      mouseHandlers: null,
    };

    this.sessions.set(sessionId, session);
    this.touchLru(sessionId);

    try {
      session.unlistenOutput = await listen<TerminalOutputPayload>(
        `terminal-output-${sessionId}`,
        (event) => {
          const cached = this.sessions.get(sessionId);
          if (!cached) {
            return;
          }

          try {
            const bytes = decodeBase64Bytes(event.payload.data);
            cached.terminal.write(bytes);
          } catch (error) {
            console.error('Failed to decode terminal output:', error);
          }
        }
      );
    } catch (error) {
      console.error('Failed to listen for terminal output:', error);
    }

    try {
      await invoke('terminal_create', {
        id: sessionId,
        cols: terminal.cols,
        rows: terminal.rows,
        cwd: options.workingDir,
      });
      session.lastReportedSize = {
        cols: terminal.cols,
        rows: terminal.rows,
      };
      session.sessionReady = true;
      await this.fitAndResize(sessionId);
    } catch (error) {
      console.error('Failed to create terminal:', error);
    }

    await this.enforceMaxSessions();

    return terminal;
  }

  attachToContainer(sessionId: string, container: HTMLDivElement): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    this.touchLru(sessionId);

    if (session.container === container) {
      return;
    }

    const element = session.terminal.element;
    if (!element) {
      session.terminal.open(container);
      session.container = container;
      return;
    }

    container.replaceChildren(element);
    session.container = container;
  }

  detachFromContainer(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.container) {
      return;
    }

    const element = session.terminal.element;
    if (element && element.parentElement === session.container) {
      session.container.removeChild(element);
    }

    session.container = null;
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    this.lruOrder = this.lruOrder.filter((id) => id !== sessionId);

    session?.unlistenOutput?.();
    session?.dataDisposable.dispose();
    session?.terminal.dispose();

    try {
      await invoke('terminal_kill', { id: sessionId });
    } catch (error) {
      console.error('Failed to kill terminal:', error);
    }
  }

  private touchLru(sessionId: string): void {
    const existingIndex = this.lruOrder.indexOf(sessionId);
    if (existingIndex !== -1) {
      this.lruOrder.splice(existingIndex, 1);
    }
    this.lruOrder.push(sessionId);
  }

  private async enforceMaxSessions(): Promise<void> {
    while (this.sessions.size > MAX_RETAINED_TERMINAL_SESSIONS && this.lruOrder.length > 0) {
      const oldestSessionId = this.lruOrder.shift();
      if (!oldestSessionId || !this.sessions.has(oldestSessionId)) {
        continue;
      }

      await this.destroySession(oldestSessionId);
    }
  }

  focus(sessionId: string): void {
    this.sessions.get(sessionId)?.terminal.focus();
  }

  async fitAndResize(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.container) {
      return;
    }

    if (session.container.clientWidth === 0 || session.container.clientHeight === 0) {
      return;
    }

    session.fitAddon.fit();

    const { cols, rows } = session.terminal;
    if (cols === session.lastReportedSize.cols && rows === session.lastReportedSize.rows) {
      return;
    }

    if (!session.sessionReady) {
      return;
    }

    try {
      await invoke('terminal_resize', {
        id: sessionId,
        cols,
        rows,
      });
      session.lastReportedSize = { cols, rows };
    } catch (error) {
      console.error('Failed to resize terminal:', error);
    }
  }

  async insertText(sessionId: string, text: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    const bytes = Array.from(textEncoder.encode(text));
    try {
      await invoke('terminal_write', { id: sessionId, data: bytes });
    } catch (error) {
      console.error('Failed to write to terminal:', error);
    }
  }
}

export const terminalSessionManager = new TerminalSessionManager();
