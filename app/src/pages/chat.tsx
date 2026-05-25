import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AnimatePresence, motion } from "framer-motion";
import { getCurrentModel, getCurrentProvider } from "../lib/ai-preferences";

type ChatReply = {
  success: boolean;
  model: string;
  response: string;
  error?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatInputMessage = {
  role: "user" | "assistant";
  content: string;
};

const SESSION_KEY = "cf_chat_session_v1";

function loadSessionMessages(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string",
    );
  } catch {
    return [];
  }
}

function formatAssistantText(input: string): string {
  const deDoubled = input
    .replace(/\b([A-Za-z]{2,})\s+\1\b/g, "$1")
    .replace(/\b([A-Za-z]{2,})\s+\1\b/g, "$1");

  return deDoubled
    .replace(/\s+(?=\d+\.\s)/g, "\n")
    .replace(/\s+(?=\*\s)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(getCurrentModel());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadSessionMessages);
  const provider = getCurrentProvider();
  const listRef = useRef<HTMLDivElement>(null);
  const activeAssistantId = useRef<string | null>(null);
  const agentName = localStorage.getItem("ai_agent_name") || model;

  useEffect(() => {
    const sync = () => setModel(getCurrentModel());
    window.addEventListener("ai-preferences-updated", sync);
    return () => window.removeEventListener("ai-preferences-updated", sync);
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(messages));
  }, [messages]);

  const contextMessages = useMemo<ChatInputMessage[]>(
    () =>
      messages.slice(-10).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  );

  useEffect(() => {
    const unlistenPromise = listen<{ chunk: string }>("ollama-chat-chunk", (event) => {
      if (!activeAssistantId.current) return;
      const chunk = event.payload?.chunk ?? "";
      if (!chunk) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === activeAssistantId.current
            ? { ...msg, content: `${msg.content}${chunk}` }
            : msg,
        ),
      );
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isLoading || !prompt.trim()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: prompt.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsLoading(true);
    setPrompt("");
    const assistantId = `${Date.now()}-assistant`;
    activeAssistantId.current = assistantId;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const result = await invoke<ChatReply>("chat_with_ollama", {
        messages: [...contextMessages, { role: "user", content: userMessage.content }],
        model,
        mode: undefined,
      });

      if (result.success) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: formatAssistantText(msg.content || result.response || "(No response text returned)") }
              : msg,
          ),
        );
      } else {
        setError(result.error || "Unknown error from Ollama.");
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
      }
    } catch (invokeError) {
      setError(String(invokeError));
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantId));
    } finally {
      activeAssistantId.current = null;
      setIsLoading(false);
      window.setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
        }
      }, 80);
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-[var(--surface)]/70 shadow-[0_20px_80px_rgba(0,0,0,0.25)]">
      <div className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">CareerForges Chat (A Trained Expert)</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {provider.toUpperCase()} | {agentName} | Session memory enabled
        </p>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--muted)]">
            Ask me anything about resumes, job descriptions, or interview prep.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user"
                ? "ml-auto bg-[var(--accent)] text-white"
                : "bg-white/[0.05] text-[var(--text)]"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-fit rounded-2xl bg-white/[0.05] px-4 py-3 text-sm text-[var(--muted)]"
          >
            Thinking...
          </motion.div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
        <div className="flex items-end gap-3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            disabled={isLoading}
            className="min-h-[52px] max-h-44 flex-1 resize-y rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm outline-none focus:border-orange-500/50"
            placeholder="Message CareerForges AI..."
          />
          <button
            type="submit"
            disabled={isLoading}
            className="h-[52px] rounded-2xl bg-[var(--accent)] px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Send
          </button>
        </div>
      </form>

      {error ? (
        <div className="mx-4 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </section>
  );
}
