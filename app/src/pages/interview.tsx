import {
  FormEvent,
  ReactNode,
  useCallback,
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

type InterviewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatReply = {
  success: boolean;
  model: string;
  response: string;
  error?: string | null;
};

const KEY =
  "cf_interview_session_v1";

const INTERVIEW_MODES = [
  {
    id: "interview_practice",
    label: "Practice Mode",
  },
  {
    id: "interview_realistic",
    label:
      "Realistic Interview Mode",
  },
  {
    id: "interview_technical",
    label:
      "Technical Interview",
  },
  {
    id: "interview_hr",
    label: "HR Interview",
  },
  {
    id:
      "interview_behavioral",
    label:
      "Behavioral Interview",
  },
  {
    id:
      "interview_rapid_fire",
    label: "Rapid Fire Round",
  },
];

const PERSONALITIES = [
  "Friendly Recruiter",
  "Strict FAANG Interviewer",
  "Startup Founder",
  "Technical Architect",
  "HR Manager",
];

type SpeechRecognitionCtor =
  new () => {
    continuous: boolean;
    interimResults: boolean;
    lang: string;

    onresult:
    | ((
      event: {
        results: ArrayLike<
          ArrayLike<{
            transcript: string;
          }>
        >;
      }
    ) => void)
    | null;

    onend:
    | (() => void)
    | null;

    start: () => void;

    stop: () => void;
  };

function loadMessages(): InterviewMessage[] {
  try {
    const raw =
      sessionStorage.getItem(
        KEY
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export default function InterviewPage() {
  const [messages, setMessages] =
    useState<
      InterviewMessage[]
    >(loadMessages);

  const [prompt, setPrompt] =
    useState("");

  const [mode, setMode] =
    useState(
      INTERVIEW_MODES[0].id
    );

  const [
    personality,
    setPersonality,
  ] = useState(
    PERSONALITIES[0]
  );

  const [
    inputSource,
    setInputSource,
  ] = useState(
    "custom_jd"
  );

  const [
    jobContext,
    setJobContext,
  ] = useState("");

  const [
    resumeContext,
    setResumeContext,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [elapsedSec, setElapsedSec] =
    useState(0);

  const [round, setRound] =
    useState(1);

  const [model, setModel] =
    useState("");

  const [provider, setProvider] =
    useState("");

  const listRef =
    useRef<HTMLDivElement>(
      null
    );

  const activeAssistantId =
    useRef<string | null>(
      null
    );

  const recognitionRef =
    useRef<{
      start: () => void;
      stop: () => void;
    } | null>(null);

  /*
    LOAD AI PREFS
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
    PERSIST + SCROLL
  */
  useEffect(() => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify(
        messages
      )
    );

    if (
      listRef.current
    ) {
      requestAnimationFrame(
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
        }
      );
    }
  }, [messages]);

  /*
    TIMER
  */
  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const t =
      window.setInterval(
        () => {
          setElapsedSec(
            (
              v
            ) => v + 1
          );
        },
        1000
      );

    return () =>
      window.clearInterval(
        t
      );
  }, [isLoading]);

  /*
    STREAMING
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
          const id =
            activeAssistantId.current;

          if (!id) {
            return;
          }

          const chunk =
            event.payload
              ?.chunk || "";

          if (!chunk) {
            return;
          }

          setMessages(
            (
              prev
            ) => {
              const copy =
                [...prev];

              const idx =
                copy.findIndex(
                  (
                    m
                  ) =>
                    m.id ===
                    id
                );

              if (
                idx === -1
              ) {
                return prev;
              }

              copy[idx] =
              {
                ...copy[
                idx
                ],
                content:
                  copy[
                    idx
                  ]
                    .content +
                  chunk,
              };

              return copy;
            }
          );
        }
      );

    return () => {
      void unlistenPromise.then(
        (
          u
        ) => u()
      );
    };
  }, []);

  /*
    CLEANUP SPEECH
  */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const contextIntro =
    useMemo(() => {
      return [
        `Interview mode: ${mode}`,
        `Interviewer personality: ${personality}`,
        `Input source: ${inputSource}`,
        `Job context: ${jobContext ||
        "Not provided"
        }`,
        `Resume context: ${resumeContext ||
        "Not provided"
        }`,
        "Rules: Ask only one question at a time. Wait for candidate answer.",
      ].join("\n");
    }, [
      jobContext,
      mode,
      personality,
      inputSource,
      resumeContext,
    ]);

  const startSpeechRecognition =
    useCallback(() => {
      const ctor =
        (
          window as unknown as {
            SpeechRecognition?: SpeechRecognitionCtor;
            webkitSpeechRecognition?: SpeechRecognitionCtor;
          }
        )
          .SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition?: SpeechRecognitionCtor;
          }
        )
          .webkitSpeechRecognition;

      if (!ctor) {
        setError(
          "Speech recognition unavailable."
        );

        return;
      }

      const recognition =
        new ctor();

      recognition.continuous =
        false;

      recognition.interimResults =
        false;

      recognition.lang =
        "en-US";

      recognition.onresult =
        (
          event
        ) => {
          const transcript =
            event
              .results[0][0]
              .transcript;

          setPrompt(
            (
              prev
            ) =>
              prev
                ? `${prev} ${transcript}`
                : transcript
          );
        };

      recognition.onend =
        () =>
          setIsListening(
            false
          );

      recognitionRef.current =
        recognition;

      setIsListening(
        true
      );

      recognition.start();
    }, []);

  const stopSpeechRecognition =
    useCallback(() => {
      recognitionRef.current?.stop();

      setIsListening(
        false
      );
    }, []);

  const speak =
    useCallback(
      (
        text: string
      ) => {
        if (
          !window.speechSynthesis ||
          !text.trim()
        ) {
          return;
        }

        window.speechSynthesis.cancel();

        const utter =
          new SpeechSynthesisUtterance(
            text
          );

        utter.rate = 1;

        utter.pitch = 1;

        utter.onstart =
          () =>
            setIsSpeaking(
              true
            );

        utter.onend =
          () =>
            setIsSpeaking(
              false
            );

        window.speechSynthesis.speak(
          utter
        );
      },
      []
    );

  const sendTurn =
    useCallback(
      async (
        event?: FormEvent,
        forcedText?: string
      ) => {
        event?.preventDefault();

        if (!model) {
          setError(
            "No AI model selected."
          );

          return;
        }

        const outgoing =
          (
            forcedText ??
            prompt
          ).trim();

        if (
          isLoading ||
          !outgoing
        ) {
          return;
        }

        const userMsg: InterviewMessage =
        {
          id: `${Date.now()}-u`,
          role: "user",
          content:
            outgoing,
        };

        const assistantId =
          `${Date.now()}-a`;

        activeAssistantId.current =
          assistantId;

        setError(null);

        setIsLoading(true);

        setElapsedSec(0);

        setPrompt("");

        setMessages(
          (
            prev
          ) => [
              ...prev,
              userMsg,
              {
                id: assistantId,
                role:
                  "assistant",
                content: "",
              },
            ]
        );

        const payloadMessages =
          [
            {
              role: "user",
              content:
                contextIntro,
            },
            ...messages
              .slice(-10)
              .map(
                (
                  m
                ) => ({
                  role:
                    m.role,
                  content:
                    m.content,
                })
              ),
            {
              role: "user",
              content:
                userMsg.content,
            },
          ];

        try {
          const result =
            await invoke<ChatReply>(
              "chat_with_ollama",
              {
                messages:
                  payloadMessages,
                model,
                mode,
              }
            );

          if (
            !result.success
          ) {
            setError(
              result.error ||
              "Interview failed."
            );

            setMessages(
              (
                prev
              ) =>
                prev.filter(
                  (
                    m
                  ) =>
                    m.id !==
                    assistantId
                )
            );
          } else {
            setMessages(
              (
                prev
              ) =>
                prev.map(
                  (
                    m
                  ) =>
                    m.id ===
                      assistantId
                      ? {
                        ...m,
                        content:
                          (
                            m.content ||
                            result.response ||
                            ""
                          ).trim(),
                      }
                      : m
                )
            );

            if (
              mode !==
              "interview_practice"
            ) {
              setRound(
                (
                  r
                ) => r + 1
              );
            }

            speak(
              result.response
            );
          }
        } catch (
        e
        ) {
          setError(
            String(e)
          );

          setMessages(
            (
              prev
            ) =>
              prev.filter(
                (
                  m
                ) =>
                  m.id !==
                  assistantId
              )
          );
        } finally {
          activeAssistantId.current =
            null;

          setIsLoading(
            false
          );
        }
      },
      [
        contextIntro,
        isLoading,
        messages,
        mode,
        model,
        prompt,
        speak,
      ]
    );

  const startInterview =
    async () => {
      if (
        messages.length >
        0
      ) {
        return;
      }

      await sendTurn(
        undefined,
        "Start the interview with the first question."
      );
    };

    const finishInterview =
  async () => {
    if (
      !model
    ) {
      setError(
        "No AI model selected."
      );

      return;
    }

    const summaryRequest =
      [
        ...messages
          .slice(-14)
          .map(
            (
              m
            ) => ({
              role:
                m.role,
              content:
                m.content,
            })
          ),
        {
          role: "user",
          content:
            "Interview ended. Give: overall score/10, communication rating, technical rating, confidence rating, strengths, missed concepts, and top 5 improvements.",
        },
      ];

    setIsLoading(
      true
    );

    try {
      const result =
        await invoke<ChatReply>(
          "chat_with_ollama",
          {
            messages:
              summaryRequest,
            model,
            mode:
              "interview_technical",
          }
        );

      if (
        result.success
      ) {
        setMessages(
          (
            prev
          ) => [
            ...prev,
            {
              id: `${Date.now()}-summary`,
              role:
                "assistant",
              content:
                result.response,
            },
          ]
        );
      } else {
        setError(
          result.error ||
            "Failed to generate interview report."
        );
      }
    } catch (
      e
    ) {
      setError(
        String(e)
      );
    } finally {
      setIsLoading(
        false
      );
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-9rem)] w-full max-w-6xl gap-4">
      <aside className="w-[320px] rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-lg font-semibold">Interview Setup</h2>
        <div className="mt-3 space-y-3">
          <Field label="Mode">
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              {INTERVIEW_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Personality">
            <select value={personality} onChange={(e) => setPersonality(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              {PERSONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Input Source">
            <select value={inputSource} onChange={(e) => setInputSource(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <option value="selected_job">Selected Job</option>
              <option value="custom_jd">Custom Job Description</option>
              <option value="resume_jd_combo">Resume + JD</option>
            </select>
          </Field>
          <Field label="Job Description / Role">
            <textarea value={jobContext} onChange={(e) => setJobContext(e.target.value)} className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </Field>
          <Field label="Resume Highlights">
            <textarea value={resumeContext} onChange={(e) => setResumeContext(e.target.value)} className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => void startInterview()} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm text-white">Start</button>
            <button onClick={() => void finishInterview()} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">Finish</button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col rounded-2xl border border-white/10 bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Interview Agent</h1>
            <p className="text-xs text-[var(--muted)]">Round {round} | Timer {elapsedSec}s | Model {model}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isListening ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
            <span className="text-xs text-[var(--muted)]">{isListening ? "Listening" : "Mic Off"}</span>
            <div className={`h-3 w-3 rounded-full ${isSpeaking ? "bg-orange-400 animate-pulse" : "bg-white/20"}`} />
            <span className="text-xs text-[var(--muted)]">{isSpeaking ? "Speaking" : "Silent"}</span>
          </div>
        </div>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === "assistant" ? "bg-white/[0.05]" : "ml-auto bg-[var(--accent)] text-white"}`}
              >
                {m.content}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading ? <p className="text-xs text-[var(--muted)]">Interviewer is thinking...</p> : null}
        </div>

        <form onSubmit={(e) => void sendTurn(e)} className="border-t border-white/10 p-3">
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="min-h-[56px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              placeholder="Type your interview answer..."
            />
            <div className="flex flex-col gap-2">
              <button type="submit" disabled={isLoading} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm text-white disabled:opacity-40">Send</button>
              {!isListening ? (
                <button type="button" onClick={startSpeechRecognition} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm">Voice</button>
              ) : (
                <button type="button" onClick={stopSpeechRecognition} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">Stop</button>
              )}
            </div>
          </div>
          {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </p>

      {children}
    </label>
  );
}
