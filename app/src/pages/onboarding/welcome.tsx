import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import LaunchLoader from "../../components/launch-loader";

export default function WelcomePage() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 3400);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <motion.div
          key="welcome-splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <section className="min-h-screen bg-[var(--bg)]">
            <LaunchLoader />
          </section>
        </motion.div>
      ) : (
        <motion.section
          key="welcome-content"
          className="flex min-h-screen items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <div className="max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
              <div className="h-2 w-2 rounded-full bg-orange-500" />
              Local AI Career Assistant
            </div>

            <h1 className="text-6xl font-bold leading-tight tracking-tight">
              Forge Your Career
              <br />
              With Local AI
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              CareerForges helps you build ATS-friendly resumes,
              analyze jobs, prepare for interviews,
              and manage applications privately on your machine.
            </p>

            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                to="/setup-ai"
                className="flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-6 py-4 font-medium text-white transition hover:scale-[1.02]"
              >
                Get Started
                <ArrowRight size={18} />
              </Link>

              <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm transition hover:bg-white/[0.06]">
                Learn More
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
