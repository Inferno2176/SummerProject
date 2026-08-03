import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/db/cloud-client";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // In a real app we'd call supabase.auth.signInWithPassword here
      // For now we will mock a successful login to unblock the UI
      // const { error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) throw error;
      
      localStorage.setItem("user_session", "true");
      navigate("/upload-resume");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/5 bg-[var(--surface)] p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Sign in to your hyrd. account</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
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
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--muted)]">
          Don't have an account?{" "}
          <button onClick={() => navigate("/signup")} className="font-semibold text-[var(--accent)] hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
