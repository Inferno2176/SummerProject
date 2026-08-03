import { motion } from "framer-motion";
import HyrdLogo from "./logo";

type LaunchLoaderProps = {
  title?: string;
  tagline?: string;
  statusText?: string;
  compact?: boolean;
};

const DEFAULT_TITLE = "hyrd.";
const DEFAULT_TAGLINE = "Forge your future with private local AI";

export default function LaunchLoader({
  title = DEFAULT_TITLE,
  tagline = DEFAULT_TAGLINE,
  statusText,
  compact = false,
}: LaunchLoaderProps) {
  const titleChars = title.split("");
  const taglineChars = tagline.split("");

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-12 text-center">
      <motion.div
        className="pointer-events-none absolute h-[320px] w-[320px] rounded-full bg-blue-600/25 blur-3xl"
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={compact ? "mb-5" : "mb-6"}
        >
          <HyrdLogo size={compact ? 56 : 72} />
        </motion.div>

        <div className="flex items-center">
          {titleChars.map((char, idx) => (
            <motion.span
              key={`${char}-${idx}`}
              className={compact ? "text-3xl font-bold tracking-tight" : "text-5xl font-bold tracking-tight"}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + idx * 0.045, duration: 0.25 }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>

        <div className="mt-3 flex items-center text-[var(--muted)]">
          {taglineChars.map((char, idx) => (
            <motion.span
              key={`${char}-${idx}`}
              className={compact ? "text-xs uppercase tracking-[0.2em]" : "text-sm uppercase tracking-[0.22em]"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.75 + idx * 0.02, duration: 0.2 }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>

        <motion.div
          className="mt-6 h-px w-52 bg-gradient-to-r from-blue-500/10 via-blue-400/90 to-blue-500/10"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.45 }}
        />

        {statusText ? (
          <motion.p
            className="mt-5 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-2 text-xs tracking-[0.14em] text-blue-300"
            key={statusText}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {statusText}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
