import { useState } from "react";

import { useNavigate } from "react-router-dom";

import { invoke } from "@tauri-apps/api/core";

export default function UploadResumePage() {
  const navigate = useNavigate();

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    resumeUploaded,
    setResumeUploaded,
  ] = useState(false);

  const [
    fileName,
    setFileName,
  ] = useState("");

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      /*
        TODO:
        Real upload/parser logic later
      */

      await new Promise((resolve) =>
        setTimeout(resolve, 1200),
      );

      setFileName(file.name);

      setResumeUploaded(true);

      console.log(
        "[Resume] Upload complete",
      );
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!resumeUploaded) return;

    try {
      const selectedProvider =
        await invoke<string>(
          "db_get_selected_provider",
        );

      const selectedModel =
        await invoke<string>(
          "db_get_selected_model",
        );

      /*
        Persist resume uploaded
      */
      await invoke(
        "db_set_app_state",
        {
          key: "resume_uploaded",
          value: "true",
          dataType: "boolean",
        },
      );

      /*
        Mark onboarding step completed
      */
      await invoke(
        "db_set_onboarding_step",
        {
          step: "completed",
        },
      );

      /*
        Complete onboarding
      */
      await invoke(
        "db_complete_onboarding",
        {
          provider:
            selectedProvider,
          model: selectedModel,
        },
      );

      console.log(
        "[Resume] Onboarding complete",
      );

      navigate(
        "/app/dashboard",
      );
    } catch (err) {
      console.error(err);
    }
  };

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
          Upload your resume to begin
          ATS analysis, interview
          preparation, and AI-powered
          job matching.
        </p>

        <div className="mt-10 flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.03]">
          <div className="text-center">
            <p className="text-lg font-medium">
              Drag & drop your resume
            </p>

            <p className="mt-2 text-sm text-[var(--muted)]">
              PDF or DOCX
            </p>

            {fileName ? (
              <div className="mt-5">
                <p className="text-sm text-green-400">
                  Uploaded:
                </p>

                <p className="mt-1 font-medium">
                  {fileName}
                </p>
              </div>
            ) : null}

            <label className="mt-6 inline-flex cursor-pointer rounded-xl bg-[var(--accent)] px-5 py-3 text-white transition hover:opacity-90">
              {uploading
                ? "Uploading..."
                : "Browse Files"}

              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={
                  handleFileSelect
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button
            onClick={handleContinue}
            disabled={!resumeUploaded}
            className={[
              "rounded-xl px-5 py-3 font-medium transition",
              resumeUploaded
                ? "bg-white text-black hover:opacity-90"
                : "cursor-not-allowed bg-white/10 text-white/40",
            ].join(" ")}
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}