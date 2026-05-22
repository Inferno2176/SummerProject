import { Link } from "react-router-dom";

export default function UploadResumePage() {
  return (
    <section className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/5 bg-[var(--surface)] p-10">
        <p className="text-sm uppercase tracking-[0.2em] text-orange-400">
          Resume Upload
        </p>

        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Upload Your Resume
        </h1>

        <p className="mt-4 leading-7 text-[var(--muted)]">
          Upload your resume to begin ATS analysis,
          interview preparation, and AI-powered job matching.
        </p>

        <div className="mt-10 flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03]">
          <div className="text-center">
            <p className="text-lg font-medium">
              Drag & drop your resume
            </p>

            <p className="mt-2 text-sm text-[var(--muted)]">
              PDF or DOCX
            </p>

            <button className="mt-6 rounded-xl bg-[var(--accent)] px-5 py-3 text-white">
              Browse Files
            </button>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <Link
            to="/app/dashboard"
            className="rounded-xl bg-white px-5 py-3 text-black transition hover:opacity-90"
          >
            Continue
          </Link>
        </div>
      </div>
    </section>
  );
}