import { spawn, IPty } from "tauri-pty";

interface PtySession {
  pty: IPty;
  buffer: string[]; // 保存輸出歷史，重新連接時回放
  listeners: Set<(data: string) => void>;
}

// 全局 PTY 管理器 - 維護 taskId -> PTY 的對應
class PtyManager {
  private sessions: Map<string, PtySession> = new Map();

  // 取得或創建 PTY session
  getOrCreate(taskId: string, options?: { workingDir?: string }): PtySession {
    let session = this.sessions.get(taskId);

    if (!session) {
      console.log("[PtyManager] Creating new PTY for task:", taskId);

      const shell = "/bin/zsh";
      const pty = spawn(shell, ["-l", "-c", "claude"], {
        cols: 80,
        rows: 24,
        cwd: options?.workingDir || undefined,
        env: {
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        },
      });

      session = {
        pty,
        buffer: [],
        listeners: new Set(),
      };

      // 監聽 PTY 輸出
      pty.onData((data: unknown) => {
        let text: string;
        if (typeof data === "string") {
          text = data;
        } else if (data instanceof Uint8Array) {
          text = new TextDecoder().decode(data);
        } else if (Array.isArray(data)) {
          text = new TextDecoder().decode(new Uint8Array(data));
        } else {
          text = String(data);
        }

        // 保存到 buffer（限制大小）
        session!.buffer.push(text);
        if (session!.buffer.length > 10000) {
          session!.buffer = session!.buffer.slice(-5000);
        }

        // 通知所有監聽者
        session!.listeners.forEach((listener) => {
          try {
            listener(text);
          } catch (e) {
            console.error("[PtyManager] Listener error:", e);
          }
        });
      });

      // PTY 退出時清理
      pty.onExit(({ exitCode }) => {
        console.log("[PtyManager] PTY exited:", taskId, exitCode);
        // 通知監聽者進程已退出
        const exitMsg = `\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`;
        session!.listeners.forEach((listener) => listener(exitMsg));
        this.sessions.delete(taskId);
      });

      this.sessions.set(taskId, session);
    }

    return session;
  }

  // 訂閱輸出
  subscribe(taskId: string, listener: (data: string) => void): () => void {
    const session = this.sessions.get(taskId);
    if (session) {
      session.listeners.add(listener);
      return () => session.listeners.delete(listener);
    }
    return () => {};
  }

  // 取得歷史輸出
  getBuffer(taskId: string): string[] {
    return this.sessions.get(taskId)?.buffer || [];
  }

  // 寫入輸入
  write(taskId: string, data: string): void {
    const session = this.sessions.get(taskId);
    if (session) {
      session.pty.write(data);
    }
  }

  // 調整大小
  resize(taskId: string, cols: number, rows: number): void {
    const session = this.sessions.get(taskId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  // 檢查是否存在
  has(taskId: string): boolean {
    return this.sessions.has(taskId);
  }

  // 強制結束
  kill(taskId: string): void {
    const session = this.sessions.get(taskId);
    if (session) {
      session.pty.kill();
      this.sessions.delete(taskId);
    }
  }

  // 重啟（結束並創建新的）
  restart(taskId: string, options?: { workingDir?: string }): PtySession {
    this.kill(taskId);
    return this.getOrCreate(taskId, options);
  }
}

// 單例
export const ptyManager = new PtyManager();
