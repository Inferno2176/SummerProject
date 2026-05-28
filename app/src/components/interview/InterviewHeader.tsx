import {
  Bot,
  Volume2,
} from "lucide-react";

type Props = {
  aiState:
    | "idle"
    | "thinking"
    | "speaking"
    | "listening";
};

export default function InterviewHeader({
  aiState,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-[24px] border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.28)]">

          <Bot size={18} />

        </div>

        <div>

          <h1 className="text-base font-semibold text-[var(--text)]">
            AI Interview
          </h1>

          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Real-time recruiter simulation
          </p>

        </div>

      </div>

      {/* STATUS */}
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">

        <div
          className={`h-2 w-2 rounded-full ${
            aiState ===
            "speaking"
              ? "bg-orange-400 animate-pulse"
              : aiState ===
                "listening"
              ? "bg-emerald-400 animate-pulse"
              : aiState ===
                "thinking"
              ? "bg-yellow-400 animate-pulse"
              : "bg-white/20"
          }`}
        />

        <Volume2
          size={14}
          className="text-orange-400"
        />

        <p className="text-xs font-medium capitalize text-[var(--text)]">
          {aiState}
        </p>

      </div>

    </div>
  );
}