import {
  Bot,
  Volume2,
  XCircle,
} from "lucide-react";

type Props = {
  aiState:
    | "idle"
    | "thinking"
    | "speaking"
    | "listening";
  onFinish?: () => void;
};

export default function InterviewHeader({
  aiState,
  onFinish,
}: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5">
      
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
          <Bot size={18} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[var(--text)]">
            AI Interview Simulation
          </h1>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Interactive AI Recruiter Practice
          </p>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* STATUS */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div
            className={`h-2 w-2 rounded-full ${
              aiState === "speaking"
                ? "bg-blue-400 animate-pulse"
                : aiState === "listening"
                ? "bg-emerald-400 animate-pulse"
                : aiState === "thinking"
                ? "bg-yellow-400 animate-pulse"
                : "bg-white/20"
            }`}
          />
          <Volume2 size={14} className="text-blue-400" />
          <p className="text-xs font-medium capitalize text-[var(--text)]">
            {aiState}
          </p>
        </div>

        {/* FINISH BUTTON */}
        <button
          onClick={onFinish}
          className="flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
        >
          <XCircle size={14} />
          Finish Interview
        </button>
      </div>
    </div>
  );
}