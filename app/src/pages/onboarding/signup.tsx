import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/db/cloud-client";
import { ArrowRight, Loader2, Mail, Lock, User, Briefcase, Code } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create user in local SQLite DB
      await invoke("db_create_user", { email, name: name || null });
      // Set active user email in DB settings
      await invoke("db_set_setting", { key: "active_user_email", value: email });
      
      localStorage.setItem("user_session", "true");
      localStorage.setItem("user_profile", JSON.stringify({ name, email, experience, skills }));
      
      navigate("/upload-resume");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-[var(--surface)] p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {step === 1 ? "Step 1 of 2: Account Details" : "Step 2 of 2: Professional Profile"}
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--muted)]">Full Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                    placeholder="Alex Mercer"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--muted)]">Email address</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--muted)]">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[var(--muted)]">Years of Experience</label>
                <div className="relative mt-1">
                  <Briefcase className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                  <select
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)] appearance-none"
                  >
                    <option value="" disabled>Select experience level</option>
                    <option value="entry">0-2 years (Entry Level)</option>
                    <option value="mid">3-5 years (Mid Level)</option>
                    <option value="senior">6+ years (Senior Level)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--muted)]">Core Skills (comma separated)</label>
                <div className="relative mt-1">
                  <Code className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    type="text"
                    required
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[var(--accent)]"
                    placeholder="React, Node.js, Python, Rust"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-2/3 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Complete Setup"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="font-semibold text-[var(--accent)] hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
