import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type WorkExperience = {
  title: string;
  company: string;
  duration: string;
  bullets: string[];
};

type Education = {
  degree: string;
  institution: string;
  year: string;
};

type ParsedResume = {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications: string[];
  languages: string[];
};

type ATSResult = {
  score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
  rewritten_summary: string;
  rewritten_bullets: string[];
};

export default function ATSPage() {
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState("");

  // Load resume from DB on mount
  useEffect(() => {
    const loadResume = async () => {
      try {
        const data = await invoke<{ parsed_content: string }>("get_default_resume");
        if (data?.parsed_content) {
          setResume(JSON.parse(data.parsed_content));
        }
      } catch (e) {
        console.error("Failed to load resume", e);
      }
    };
    void loadResume();
  }, []);

  // Listen to streaming chunks
  useEffect(() => {
    const unlisten = listen<{ chunk: string }>("ollama-chat-chunk", (e) => {
      setStreamText((prev) => prev + e.payload.chunk);
    });
    return () => { void unlisten.then((fn) => fn()); };
  }, []);

  const analyzeATS = async () => {
    if (!resume || !jobDescription.trim()) return;

    setAnalyzing(true);
    setResult(null);
    setError(null);
    setStreamText("");

    try {
      const model = await invoke<string>("db_get_selected_model");

      const prompt = `You are an ATS resume expert. Analyze this resume against the job description and return ONLY valid JSON.

Resume:
Name: ${resume.name}
Summary: ${resume.summary}
Skills: ${resume.skills.join(", ")}
Experience: ${resume.experience.map((e) => `${e.title} at ${e.company}: ${e.bullets.join(". ")}`).join("\n")}
Education: ${resume.education.map((e) => `${e.degree} from ${e.institution}`).join(", ")}

Job Description:
${jobDescription.slice(0, 3000)}

Return this exact JSON structure:
{
  "score": 85,
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["missing1", "missing2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "rewritten_summary": "ATS optimized summary here",
  "rewritten_bullets": ["• Optimized bullet 1", "• Optimized bullet 2"]
}`;

      const response = await invoke<{ success: boolean; response: string }>(
        "chat_with_ollama",
        {
          messages: [{ role: "user", content: prompt }],
          model,
          mode: "career",
        }
      );

      if (response.success) {
        // Strip markdown if model wraps in ```json
        const cleaned = response.response
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed: ATSResult = JSON.parse(cleaned);
        setResult(parsed);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setAnalyzing(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "border-green-500/30 bg-green-500/10";
    if (score >= 60) return "border-yellow-500/30 bg-yellow-500/10";
    return "border-red-500/30 bg-red-500/10";
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-2">

      <div>
        <h1 className="text-3xl font-bold tracking-tight">ATS Analysis</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Paste a job description and get your resume scored and optimized instantly.
        </p>
      </div>

      {/* Resume loaded indicator */}
      {resume ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3">
          <span className="text-green-400">✓</span>
          <div>
            <p className="text-sm font-medium text-green-300">Resume loaded</p>
            <p className="text-xs text-[var(--muted)]">
              {resume.name} · {resume.skills.length} skills · {resume.experience.length} roles
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
          <span className="text-yellow-400">⚠</span>
          <p className="text-sm text-yellow-300">
            No resume found. Upload your resume first from the onboarding screen.
          </p>
        </div>
      )}

      {/* Job Description Input */}
      <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-6">
        <label className="mb-3 block text-sm font-medium">
          Paste Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={8}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20"
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">
            {jobDescription.length} characters
          </p>
          <button
            onClick={analyzeATS}
            disabled={!resume || !jobDescription.trim() || analyzing}
            className={[
              "rounded-xl px-5 py-3 text-sm font-medium transition",
              !resume || !jobDescription.trim() || analyzing
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-[var(--accent)] text-white hover:opacity-90",
            ].join(" ")}
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              "Analyze Resume"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">

          {/* Score */}
          <div className={`flex items-center justify-between rounded-2xl border p-6 ${scoreBg(result.score)}`}>
            <div>
              <p className="text-sm text-[var(--muted)]">ATS Match Score</p>
              <p className={`text-5xl font-bold ${scoreColor(result.score)}`}>
                {result.score}<span className="text-2xl">%</span>
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {result.score >= 80 ? "Strong match — ready to apply" :
                 result.score >= 60 ? "Moderate match — review suggestions" :
                 "Weak match — significant improvements needed"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--muted)]">Keywords matched</p>
              <p className="text-2xl font-bold">
                {result.matched_keywords.length}
                <span className="text-sm text-[var(--muted)]">/{result.matched_keywords.length + result.missing_keywords.length}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">

            {/* Matched Keywords */}
            <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-5">
              <h3 className="mb-3 text-sm font-semibold text-green-400">
                ✓ Matched Keywords ({result.matched_keywords.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.matched_keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300 border border-green-500/20">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Keywords */}
            <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-5">
              <h3 className="mb-3 text-sm font-semibold text-red-400">
                ✗ Missing Keywords ({result.missing_keywords.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-red-500/10 px-3 py-1 text-xs text-red-300 border border-red-500/20">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Suggestions */}
          <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-5">
            <h3 className="mb-3 text-sm font-semibold">Improvement Suggestions</h3>
            <ul className="space-y-2">
              {result.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--muted)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-xs text-orange-300">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Rewritten Summary */}
          {result.rewritten_summary && (
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-orange-300">ATS-Optimized Summary</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(result.rewritten_summary)}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[var(--muted)] hover:bg-white/5"
                >
                  Copy
                </button>
              </div>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {result.rewritten_summary}
              </p>
            </div>
          )}

          {/* Rewritten Bullets */}
          {result.rewritten_bullets?.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-[var(--surface)] p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Optimized Experience Bullets</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(result.rewritten_bullets.join("\n"))}
                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[var(--muted)] hover:bg-white/5"
                >
                  Copy All
                </button>
              </div>
              <ul className="space-y-2">
                {result.rewritten_bullets.map((b, i) => (
                  <li key={i} className="text-sm text-[var(--muted)]">{b}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}