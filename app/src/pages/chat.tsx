import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { invoke } from "@tauri-apps/api/core";

import { listen } from "@tauri-apps/api/event";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  getCurrentModel,
  getCurrentProvider,
} from "../lib/ai-preferences";

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

const SESSION_KEY =
  "cf_chat_session_v1";

function loadSessionMessages(): ChatMessage[] {
  try {
    const raw =
      sessionStorage.getItem(
        SESSION_KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(
        raw
      ) as ChatMessage[];

    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.id ===
          "string" &&
        (item.role ===
          "user" ||
          item.role ===
            "assistant") &&
        typeof item.content ===
          "string"
    );
  } catch {
    return [];
  }
}

function formatAssistantText(
  input: string
): string {
  const deDoubled =
    input
      .replace(
        /\b([A-Za-z]{2,})\s+\1\b/g,
        "$1"
      )
      .replace(
        /\b([A-Za-z]{2,})\s+\1\b/g,
        "$1"
      );

  return deDoubled
    .replace(
      /\s+(?=\d+\.\s)/g,
      "\n"
    )
    .replace(
      /\s+(?=\*\s)/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}

export default function ChatPage() {
  const [prompt, setPrompt] =
    useState("");

  const [model, setModel] =
    useState("");

  const [provider, setProvider] =
    useState("");

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [isLoading, setIsLoading] =
    useState(false);

  const [messages, setMessages] =
    useState<ChatMessage[]>(
      loadSessionMessages
    );

  const listRef =
    useRef<HTMLDivElement>(
      null
    );

  const activeAssistantId =
    useRef<string | null>(
      null
    );

  const agentName =
    localStorage.getItem(
      "ai_agent_name"
    ) || model;

  /*
    SYNC AI PREFERENCES
  */
  useEffect(() => {
    let mounted = true;

    const sync =
      async () => {
        const currentModel =
          await getCurrentModel();

        const currentProvider =
          await getCurrentProvider();

        if (!mounted) {
          return;
        }

        setModel(
          currentModel
        );

        setProvider(
          currentProvider
        );
      };

    void sync();

    window.addEventListener(
      "ai-preferences-updated",
      sync
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "ai-preferences-updated",
        sync
      );
    };
  }, []);

  /*
    PERSIST CHAT
  */
  useEffect(() => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(
        messages
      )
    );
  }, [messages]);

  /*
    AUTO SCROLL
  */
  useEffect(() => {
    if (
      listRef.current
    ) {
      const scrollElement =
        listRef.current;

      scrollElement.scrollTop =
        scrollElement.scrollHeight;
    }
  }, [messages]);

  /*
    CONTEXT WINDOW
  */
  const contextMessages =
    useMemo<
      ChatInputMessage[]
    >(
      () =>
        messages
          .slice(-10)
          .map(
            (
              message
            ) => ({
              role: message.role,
              content:
                message.content,
            })
          ),
      [messages]
    );

  /*
    STREAM LISTENER
  */
  useEffect(() => {
    const unlistenPromise =
      listen<{
        chunk: string;
      }>(
        "ollama-chat-chunk",
        (
          event
        ) => {
          if (
            !activeAssistantId.current
          ) {
            return;
          }

          const chunk =
            event.payload
              ?.chunk ?? "";

          if (!chunk) {
            return;
          }

          setMessages(
            (
              prev
            ) =>
              prev.map(
                (
                  msg
                ) =>
                  msg.id ===
                  activeAssistantId.current
                    ? {
                        ...msg,
                        content: `${msg.content}${chunk}`,
                      }
                    : msg
              )
          );
        }
      );

    return () => {
      void unlistenPromise.then(
        (
          unlisten
        ) =>
          unlisten()
      );
    };
  }, []);

  /*
    SEND MESSAGE
  */
  const handleSubmit =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      if (
        isLoading ||
        !prompt.trim()
      ) {
        return;
      }

      const userMessage: ChatMessage =
        {
          id: `${Date.now()}-user`,
          role: "user",
          content:
            prompt.trim(),
        };

      setMessages(
        (prev) => [
          ...prev,
          userMessage,
        ]
      );

      setError(null);

      setIsLoading(true);

      setPrompt("");

      const assistantId =
        `${Date.now()}-assistant`;

      activeAssistantId.current =
        assistantId;

      setMessages(
        (prev) => [
          ...prev,
          {
            id: assistantId,
            role:
              "assistant",
            content: "",
          },
        ]
      );

      try {
        const result =
          await invoke<ChatReply>(
            "chat_with_ollama",
            {
              messages: [
                ...contextMessages,
                {
                  role: "user",
                  content:
                    userMessage.content,
                },
              ],
              model,
              mode:
                undefined,
            }
          );

        if (
          result.success
        ) {
          setMessages(
            (
              prev
            ) =>
              prev.map(
                (
                  msg
                ) =>
                  msg.id ===
                  assistantId
                    ? {
                        ...msg,
                        content:
                          formatAssistantText(
                            msg.content ||
                              result.response ||
                              "(No response text returned)"
                          ),
                      }
                    : msg
              )
          );
        } else {
          setError(
            result.error ||
              "Unknown error from Ollama."
          );

          setMessages(
            (
              prev
            ) =>
              prev.filter(
                (
                  msg
                ) =>
                  msg.id !==
                  assistantId
              )
          );
        }
      } catch (
        invokeError
      ) {
        setError(
          String(
            invokeError
          )
        );

        setMessages(
          (
            prev
          ) =>
            prev.filter(
              (
                msg
              ) =>
                msg.id !==
                assistantId
            )
        );
      } finally {
        activeAssistantId.current =
          null;

        setIsLoading(
          false
        );

        window.setTimeout(
          () => {
            if (
              listRef.current
            ) {
              listRef.current.scrollTo(
                {
                  top: listRef
                    .current
                    .scrollHeight,
                  behavior:
                    "smooth",
                }
              );
            }
          },
          80
        );
      }
    };

  return (
    <section className="mx-auto flex h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/5 bg-[var(--surface)]/50 shadow-lg">
      <div className="border-b border-white/5 px-5 py-3">
        <h1 className="text-sm font-semibold tracking-tight">
          CareerForges Chat
        </h1>

        <p className="mt-0.5 text-xs text-[var(--muted)]/70">
          {String(
            provider ||
              ""
          ).toUpperCase()}{" "}
          •{" "}
          {agentName}
        </p>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        {messages.length ===
        0 ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-[var(--muted)]/60">
            Ask me anything
            about resumes,
            job
            descriptions,
            or interview
            prep.
          </div>
        ) : null}

        <AnimatePresence initial={false}>
          {messages.map(
            (
              message
            ) => (
              <motion.div
                key={
                  message.id
                }
                initial={{
                  opacity: 0,
                  y: 8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: 0.15,
                  ease: "easeOut",
                }}
                className={`flex w-full ${
                  message.role ===
                  "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-5 ${
                    message.role ===
                    "user"
                      ? "bg-orange-500/80 text-white"
                      : "bg-white/[0.04] text-[var(--text)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {
                      message.content
                    }
                  </div>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {isLoading ? (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            className="w-fit rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-[var(--muted)]/70"
          >
            Thinking...
          </motion.div>
        ) : null}
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="border-t border-white/5 px-5 py-3"
      >
        <div className="flex items-end gap-2.5">
          <textarea
            value={prompt}
            onChange={(
              event
            ) =>
              setPrompt(
                event.target
                  .value
              )
            }
            disabled={
              isLoading
            }
            className="min-h-[40px] max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm placeholder-[var(--muted)]/40 outline-none transition focus:border-orange-500/40 focus:bg-white/[0.06]"
            placeholder="Message..."
          />

          <button
            type="submit"
            disabled={
              isLoading
            }
            className="h-10 rounded-xl bg-orange-500 px-4 text-xs font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>

      {error ? (
        <div className="mx-5 mb-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3.5 py-2.5 text-xs text-red-200/80">
          {error}
        </div>
      ) : null}
    </section>
  );
}