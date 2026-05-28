import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { invoke } from "@tauri-apps/api/core";

import { listen } from "@tauri-apps/api/event";

import {
  getCurrentModel,
  getCurrentProvider,
} from "../lib/ai-preferences";

import InterviewHeader from "../components/interview/InterviewHeader";

import InterviewSetupPanel from "../components/interview/InterviewSetupPanel";

import InterviewTabs from "../components/interview/InterviewTabs";

import VoiceDock from "../components/interview/VoiceDock";

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


type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;

  onresult:
  | ((
    event: SpeechRecognitionEvent
  ) => void)
  | null;

  onend:
  | (() => void)
  | null;

  onerror:
  | (() => void)
  | null;

  start: () => void;

  stop: () => void;
};

type SpeechRecognitionCtor =
  new () => SpeechRecognitionInstance;


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

  const silenceTimeoutRef =
    useRef<number | null>(
      null
    );

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

  const [aiState, setAiState] =
    useState<
      | "idle"
      | "thinking"
      | "speaking"
      | "listening"
    >("idle");

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
    PERSIST
  */
  useEffect(() => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify(
        messages
      )
    );
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
          () => {
            setIsSpeaking(
              true
            );

            setAiState(
              "speaking"
            );
          };

        utter.onend =
          () => {
            setIsSpeaking(
              false
            );

            setAiState(
              "idle"
            );
          };

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

        setAiState(
          "thinking"
        );

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
              (prev) =>
                prev.map(
                  (m) =>
                    m.id ===
                      assistantId
                      ? {
                        ...m,
                        content:
                          m.content.trim() ||
                          result.response.trim(),
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

      if (
        recognitionRef.current
      ) {
        recognitionRef.current.stop();
      }

      const recognition =
        new ctor();

      recognition.continuous =
        true;

      recognition.interimResults =
        true;

      recognition.lang =
        "en-US";

      recognition.onresult =
        (event) => {
          let transcript =
            "";

          for (
            let i = 0;
            i <
            event.results.length;
            i++
          ) {
            transcript +=
              event.results[i][0]
                .transcript + " ";
          }

          const cleaned =
            transcript.trim();

          setPrompt(
            cleaned
          );

          if (
            silenceTimeoutRef.current
          ) {
            clearTimeout(
              silenceTimeoutRef.current
            );
          }

          silenceTimeoutRef.current =
            window.setTimeout(
              () => {
                if (
                  cleaned &&
                  !isLoading
                ) {
                  void sendTurn(
                    undefined,
                    cleaned
                  );
                }
              },
              1600
            );
        };

      recognition.onerror =
        () => {
          setIsListening(
            false
          );

          setAiState(
            "idle"
          );
        };

      recognition.onend =
        () => {
          if (
            recognitionRef.current &&
            isListening
          ) {
            try {
              recognition.start();
            } catch {
              //
            }
          }
        };

      recognitionRef.current =
        recognition;

      setIsListening(
        true
      );

      setAiState(
        "listening"
      );

      recognition.start();
    }, [
      isListening,
      isLoading,
      sendTurn,
    ]);



  const stopSpeechRecognition =
    useCallback(() => {
      if (
        silenceTimeoutRef.current
      ) {
        clearTimeout(
          silenceTimeoutRef.current
        );
      }

      recognitionRef.current?.stop();

      recognitionRef.current =
        null;

      setIsListening(
        false
      );

      setAiState(
        "idle"
      );

      setPrompt("");
    }, []);

  const startInterview =
    async () => {
      setMessages([]);

      setRound(1);

      setElapsedSec(0);

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

  const latestAssistantMessage =
    [...messages]
      .reverse()
      .find(
        (m) =>
          m.role ===
          "assistant"
      )?.content || "";

  return (
    <section className="flex h-[calc(100vh-4.5rem)] gap-5 overflow-hidden">

      {/* LEFT */}
      <InterviewSetupPanel
        role={jobContext}
        setRole={setJobContext}

        level={inputSource}
        setLevel={setInputSource}

        type={mode}
        setType={setMode}

        jobDescription={jobContext}
        setJobDescription={setJobContext}

        resumeContext={resumeContext}
        setResumeContext={setResumeContext}

        personality={personality}
        setPersonality={setPersonality}

        startInterview={() => {
          void startInterview();
        }}

        finishInterview={() => {
          void finishInterview();
        }}
      />

      {/* RIGHT */}
      <div className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden">

        {/* HEADER */}
        <InterviewHeader
          aiState={aiState}
        />

        {/* TABS */}
        <InterviewTabs
          messages={messages}
          latestMessage={
            latestAssistantMessage
          }
          speaking={isSpeaking}
          listening={isListening}
          thinking={isLoading}
          aiState={aiState}
        />

        {/* DOCK */}
        <VoiceDock
          listening={
            isListening
          }
          input={prompt}
          setInput={
            setPrompt
          }
          onSend={() =>
            void sendTurn()
          }
          toggleListening={() => {
            if (
              isListening
            ) {
              stopSpeechRecognition();
            } else {
              startSpeechRecognition();
            }
          }}
        />

        {/* ERROR */}
        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

      </div>

    </section>
  );
}
