import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SplashScreen from "../../splashScreen";
import { getModelCatalog, getSetupDiagnostics, ModelCatalogItem, setAgentByModel, SetupDiagnostics } from "../../lib/ai-preferences";

type SetupStep = {
  name: string;
  status: string;
  detail: string;
};

type OllamaSetupReport = {
  success: boolean;
  os: string;
  arch: string;
  ollamaInstalled: boolean;
  ollamaRunning: boolean;
  modelReady: boolean;
  modelName: string;
  steps: SetupStep[];
};

type InstallProgress = {
  model: string;
  status: string;
  completed?: number;
  total?: number;
  percent?: number;
};

const MANUAL_COMMANDS = {
  windows: [
    "winget install --id Ollama.Ollama -e",
    "ollama serve",
    "ollama pull qwen2.5:3b",
    "ollama list",
  ],
  macos: [
    "brew install --cask ollama",
    "ollama serve",
    "ollama pull qwen2.5:3b",
    "ollama list",
  ],
  linux: [
    "curl -fsSL https://ollama.com/install.sh | sh",
    "ollama serve",
    "ollama pull qwen2.5:3b",
    "ollama list",
  ],
};

export default function SetupAIPage() {
  const [diagnostics, setDiagnostics] = useState<SetupDiagnostics | null>(null);
  const [catalog, setCatalog] = useState<ModelCatalogItem[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isInstallingCore, setIsInstallingCore] = useState(false);
  const [statusText, setStatusText] = useState("Preparing setup...");
  const [report, setReport] = useState<OllamaSetupReport | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [openManual, setOpenManual] = useState(false);
  const [installingModel, setInstallingModel] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);

  const selectedModelData = useMemo(
    () => catalog.find((m) => m.name === selectedModel),
    [catalog, selectedModel],
  );

  const refreshAll = async () => {
    const [diag, models] = await Promise.all([getSetupDiagnostics(), getModelCatalog()]);
    setDiagnostics(diag);
    setCatalog(models);
    const recommended = models.find((m) => m.recommended)?.name || diag?.recommendedModel || models[0]?.name || "";
    setSelectedModel((prev) => prev || recommended);
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    const unlistenPromise = listen<InstallProgress>("model-install-progress", (event) => {
      setInstallProgress(event.payload);
    });
    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const startInstallCore = async () => {
    setErrorText(null);
    setReport(null);
    setIsInstallingCore(true);
    setStatusText("Checking dependencies and environment...");
    try {
      const result = await invoke<OllamaSetupReport>("run_ollama_setup");
      setReport(result);
      setStatusText(result.success ? "Setup completed successfully." : "Setup finished with issues.");
      await refreshAll();
    } catch (error) {
      setErrorText(String(error));
      setStatusText("Setup failed.");
    } finally {
      setIsInstallingCore(false);
    }
  };

  const handleInstallModel = async (model: string) => {
    setInstallingModel(model);
    setInstallProgress({ model, status: "Starting download..." });
    try {
      const result = await invoke<{ success: boolean; error?: string | null }>("install_model", { model });
      if (!result.success) {
        setErrorText(result.error || "Model install failed.");
      } else {
        setAgentByModel(model);
      }
      await refreshAll();
    } catch (error) {
      setErrorText(String(error));
    } finally {
      setInstallingModel(null);
    }
  };

  const handleUninstallModel = async (model: string) => {
    try {
      await invoke("uninstall_model", { model });
      await refreshAll();
    } catch (error) {
      setErrorText(String(error));
    }
  };

  const continueNext = () => {
    if (selectedModel) {
      const found = catalog.find((m) => m.name === selectedModel);
      setAgentByModel(selectedModel, found?.name || selectedModel);
    }
  };

  const activeCommands =
    diagnostics?.os === "windows"
      ? MANUAL_COMMANDS.windows
      : diagnostics?.os === "macos"
        ? MANUAL_COMMANDS.macos
        : MANUAL_COMMANDS.linux;

  return (
    <section className="relative h-screen overflow-y-auto bg-[var(--bg)]">
      {isInstallingCore ? (
        <div className="fixed inset-0 z-50 bg-[var(--bg)]/90 backdrop-blur-sm">
          <SplashScreen />
          <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-xl border border-orange-500/25 bg-black/35 px-4 py-2 text-sm text-orange-200">
            {statusText}
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-30 border-b border-white/10 bg-[var(--surface)]/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-orange-400">AI Setup</p>
            <h1 className="mt-1 text-2xl font-bold">Get Local AI Running</h1>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <p>Step 2 of 3</p>
            <p>{diagnostics?.performanceTier || "Detecting system..."}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatusCard title="Ollama Installed" value={diagnostics?.ollamaInstalled ? "Yes" : "No"} />
          <StatusCard title="Ollama Running" value={diagnostics?.ollamaRunning ? "Yes" : "No"} />
          <StatusCard title="Models Installed" value={String(diagnostics?.installedModels.length || 0)} />
          <StatusCard title="Recommended Model" value={diagnostics?.recommendedModel || "-"} />
          <StatusCard title="System Tier" value={diagnostics?.performanceTier || "-"} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Guided Setup</h2>
              <p className="text-sm text-[var(--muted)]">
                We auto-detect your system and suggest a model that feels fast and reliable.
              </p>
            </div>
            <button
              onClick={startInstallCore}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Install Ollama Core
            </button>
          </div>
          {report ? (
            <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              {report.steps.map((step, idx) => (
                <div key={`${step.name}-${idx}`} className="text-xs text-[var(--muted)]">
                  <span className="font-medium text-white/90">{step.name}</span>: {step.detail}
                </div>
              ))}
            </div>
          ) : null}
          {errorText ? <p className="mt-3 text-sm text-red-300">{errorText}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Choose Your Model</h2>
            <button
              onClick={() => void refreshAll()}
              className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[var(--muted)] transition hover:bg-white/[0.05]"
            >
              Refresh
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map((model) => (
              <button
                type="button"
                key={model.name}
                onClick={() => setSelectedModel(model.name)}
                className={`rounded-xl border p-4 text-left transition ${selectedModel === model.name ? "border-orange-500/60 bg-orange-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{model.name}</p>
                  {model.recommended ? <span className="rounded-full bg-orange-500/20 px-2 py-1 text-[10px] text-orange-200">Recommended</span> : null}
                </div>
                <p className="mt-2 text-xs text-[var(--muted)]">Size: {model.sizeLabel} | RAM: ~{model.estimatedRamGb} GB</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Speed: {model.speed} | Quality: {model.quality}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Use case: {model.bestUseCase}</p>
                <p className="mt-1 text-xs text-cyan-300">{model.tag}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              disabled={!selectedModel || !!installingModel}
              onClick={() => selectedModel && void handleInstallModel(selectedModel)}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {installingModel ? "Installing..." : "Install / Update Selected"}
            </button>
            <button
              disabled={!selectedModelData?.installed || !!installingModel}
              onClick={() => selectedModel && void handleUninstallModel(selectedModel)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:bg-white/[0.06] disabled:opacity-40"
            >
              Uninstall Selected
            </button>
            <button
              disabled={!selectedModel}
              onClick={continueNext}
              className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-200 transition hover:bg-green-500/20 disabled:opacity-40"
            >
              Set Active Model
            </button>
          </div>

          <AnimatePresence>
            {installProgress && installingModel ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <p className="text-xs text-white/90">{installProgress.model}: {installProgress.status}</p>
                <div className="mt-2 h-2 rounded bg-white/10">
                  <div className="h-2 rounded bg-orange-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, installProgress.percent || 0))}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-[var(--muted)]">{installProgress.percent ? `${installProgress.percent.toFixed(1)}%` : "Preparing download..."}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
          <button
            onClick={() => setOpenManual((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h2 className="text-lg font-semibold">Manual Setup Guide</h2>
              <p className="text-sm text-[var(--muted)]">Beginner-friendly fallback if auto setup fails.</p>
            </div>
            <span className="text-sm text-[var(--muted)]">{openManual ? "Hide" : "Show"}</span>
          </button>

          <AnimatePresence initial={false}>
            {openManual ? (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 space-y-3">
                  {activeCommands.map((cmd, idx) => (
                    <div key={`${cmd}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-xs text-[var(--muted)]">Step {idx + 1}</p>
                      <code className="mt-1 block text-sm">{cmd}</code>
                      <button
                        onClick={() => void navigator.clipboard.writeText(cmd)}
                        className="mt-2 rounded-md border border-white/10 px-2 py-1 text-xs transition hover:bg-white/[0.06]"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                  <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-100">
                    Troubleshooting: If model download is slow, keep Ollama service running and retry one model at a time.
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex justify-end">
          <Link to="/upload-resume" onClick={continueNext} className="rounded-xl bg-white px-5 py-3 text-black transition hover:opacity-90">
            Continue
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{title}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
