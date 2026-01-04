import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, X, AlertCircle, Key, User } from "lucide-react";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  streaming?: boolean; // 標記正在串流中的訊息
}

interface LLMDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
}

type AuthMode = "subscription" | "api_key" | "not_logged_in" | null;

export function LLMDrawer({ open, onOpenChange, taskTitle }: LLMDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef<string>("");

  // Check Claude CLI installation and auth on mount
  useEffect(() => {
    checkClaudeInstalled();
    checkAuthMode();
  }, []);

  const checkAuthMode = async () => {
    try {
      const mode = await invoke<string>("check_claude_auth");
      setAuthMode(mode as AuthMode);
    } catch {
      setAuthMode("not_logged_in");
    }
  };

  // Initialize messages when drawer opens
  useEffect(() => {
    if (open) {
      setMessages([
        {
          role: "system",
          content: `AI Assistant v1.0.0`,
        },
        {
          role: "assistant",
          content: `Connected. Task: "${taskTitle}"`,
        },
        {
          role: "system",
          content: `Type your message and press Enter to send.`,
        },
      ]);
    }
  }, [open, taskTitle]);

  const checkClaudeInstalled = async () => {
    try {
      const installed = await invoke<boolean>("check_claude_installed");
      setClaudeInstalled(installed);
      if (!installed) {
        setMessages([
          {
            role: "system",
            content: `Claude CLI not found.`,
          },
          {
            role: "system",
            content: `Install: npm install -g @anthropic-ai/claude-cli`,
          },
          {
            role: "system",
            content: `Then run: claude login`,
          },
        ]);
      }
    } catch (error) {
      setMessages([
        {
          role: "system",
          content: `Error checking Claude CLI: ${error}`,
        },
      ]);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: `> ${input}` };
    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsThinking(true);
    streamingContentRef.current = "";

    if (claudeInstalled !== true) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `[Error] Claude CLI not installed or not logged in.`,
        },
      ]);
      setIsThinking(false);
      return;
    }

    // 添加一個空的串流訊息
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", streaming: true },
    ]);

    const unlisteners: UnlistenFn[] = [];

    try {
      // 監聽串流事件
      const unlistenDelta = await listen<string>("claude:delta", (event) => {
        streamingContentRef.current += event.payload;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (lastIdx >= 0 && newMessages[lastIdx].streaming) {
            newMessages[lastIdx] = {
              ...newMessages[lastIdx],
              content: streamingContentRef.current,
            };
          }
          return newMessages;
        });
      });
      unlisteners.push(unlistenDelta);

      const unlistenError = await listen<string>("claude:error", (event) => {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: `[Error] ${event.payload}` },
        ]);
      });
      unlisteners.push(unlistenError);

      const unlistenDone = await listen<string>("claude:done", (event) => {
        if (event.payload) {
          setSessionId(event.payload);
        }
        // 標記串流結束
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (lastIdx >= 0 && newMessages[lastIdx].streaming) {
            newMessages[lastIdx] = {
              ...newMessages[lastIdx],
              streaming: false,
            };
          }
          return newMessages;
        });
        setIsThinking(false);
      });
      unlisteners.push(unlistenDone);

      // 發送訊息（串流模式）
      await invoke<string>("stream_claude_message", {
        message: userInput,
        sessionId: sessionId,
      });
    } catch (error) {
      setMessages((prev) => {
        // 移除空的串流訊息
        const filtered = prev.filter((m) => !(m.streaming && !m.content));
        return [
          ...filtered,
          { role: "system", content: `[Error] ${error}` },
        ];
      });
      setIsThinking(false);
    } finally {
      // 清理所有監聽器
      for (const unlisten of unlisteners) {
        unlisten();
      }
    }
  }, [input, claudeInstalled, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlay={false}
        className="w-[400px] sm:max-w-[400px] bg-black border-l border-green-900 text-green-500 font-mono p-0"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="border-b border-green-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-green-600" />
              <SheetTitle className="text-green-500 text-sm font-mono">
                ai_terminal
              </SheetTitle>
              {claudeInstalled === false && (
                <div className="flex items-center gap-1 text-red-500" title="Claude CLI not installed">
                  <AlertCircle className="h-3 w-3" />
                </div>
              )}
              {claudeInstalled && authMode === "subscription" && (
                <div className="flex items-center gap-1 text-blue-400" title="Using Claude subscription">
                  <User className="h-3 w-3" />
                </div>
              )}
              {claudeInstalled && authMode === "api_key" && (
                <div className="flex items-center gap-1 text-yellow-400" title="Using API key">
                  <Key className="h-3 w-3" />
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>

          {/* Terminal Output */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-4 space-y-1">
                {messages.map((msg, index) => (
                  <div key={index} className="font-mono text-sm leading-relaxed">
                    {msg.role === "system" && (
                      <span className="text-green-900"># {msg.content}</span>
                    )}
                    {msg.role === "user" && (
                      <span className="text-green-400">{msg.content}</span>
                    )}
                    {msg.role === "assistant" && (
                      <span className="text-green-500">
                        {msg.content}
                        {msg.streaming && (
                          <span className="inline-block w-2 h-4 bg-green-500 animate-pulse ml-0.5" />
                        )}
                      </span>
                    )}
                  </div>
                ))}
                {isThinking && (
                  <div className="font-mono text-sm text-green-700 animate-pulse">
                    [Processing...]
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Line */}
          <div className="border-t border-green-900 p-3 bg-black">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-mono text-sm">$</span>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="flex-1 bg-transparent border-none text-green-500 placeholder:text-green-900 focus:outline-none focus:ring-0 focus-visible:ring-0 px-0 font-mono text-sm"
                autoFocus
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
