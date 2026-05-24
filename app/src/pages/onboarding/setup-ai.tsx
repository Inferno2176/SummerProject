import { useState } from "react";
import { Link } from "react-router-dom";
import SplashScreen from "../../splashScreen";

export default function SetupAIPage() {
  const [isInstalling, setIsInstalling] = useState(false);

  return (
    <section className="relative flex min-h-screen items-center justify-center px-6">
      {isInstalling ? (
        <div className="absolute inset-0 z-20 bg-[var(--bg)]/95 backdrop-blur-sm">
          <SplashScreen />
        </div>
      ) : null}

      <div className="w-full max-w-3xl rounded-3xl border border-white/5 bg-[var(--surface)] p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-orange-400">
          AI Setup
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Configure Your Local AI
        </h1>

        <p className="mt-4 text-[var(--muted)] leading-7">
          CareerForges runs locally using Ollama and open-source models.
          Your resume and career data stay fully private.
        </p>

        <div className="mt-10 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Ollama
              </h2>

              <p className="mt-2 text-sm text-[var(--muted)]">
                Recommended runtime for local AI inference.
              </p>
            </div>

            <div className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-400">
              Recommended
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => {
                setIsInstalling(true);
              }}
              className="rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white transition hover:opacity-90"
            >
              Install Ollama
            </button>

            <button className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 transition hover:bg-white/[0.06]">
              Manual Setup
            </button>
          </div>

          {isInstalling ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-xs text-orange-300">
              <span>Setup preview mode active</span>
              <button
                onClick={() => setIsInstalling(false)}
                className="rounded-lg border border-orange-500/40 px-3 py-1 transition hover:bg-orange-500/20"
              >
                Close Loader
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-10 flex justify-end">
          <Link
            to="/upload-resume"
            className="rounded-xl bg-white px-5 py-3 text-black transition hover:opacity-90"
          >
            Continue
          </Link>
        </div>
      </div>
    </section>
  );
}