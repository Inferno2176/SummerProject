import { useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { checkForUpdatesDebug } from "../lib/updater";

export default function DebugUpdatePage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [appInfo, setAppInfo] = useState<any>(null);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const result = await checkForUpdatesDebug();
      setStatus(result);
    } catch (error) {
      setStatus({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const handleGetAppInfo = async () => {
    try {
      const version = await getVersion();
      setAppInfo({
        version,
        platform: navigator.userAgent,
        updaterActive: true,
        endpoint:
          "https://github.com/JoshiNaidu/career-forges/releases/latest/download/latest.json",
        lastUpdateCheck: localStorage.getItem("lastUpdateCheck"),
      });
    } catch (error) {
      setAppInfo({ error: String(error) });
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem("lastUpdateCheck");
    setStatus({ message: "Update check cache cleared." });
  };

  const handleTestEndpoint = async () => {
    try {
      const url =
        "https://github.com/JoshiNaidu/career-forges/releases/latest/download/latest.json";
      const response = await fetch(url);
      const data = await response.json();
      setStatus({ endpoint: data });
    } catch (error) {
      setStatus({ endpoint_error: String(error) });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] p-8 text-[var(--text)]">
      <h1 className="mb-6 text-3xl font-bold">Update Debugger</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={handleGetAppInfo}
          className="rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Get App Info
        </button>

        <button
          onClick={handleTestEndpoint}
          className="rounded-lg bg-purple-600 px-4 py-3 font-semibold text-white transition hover:bg-purple-700"
        >
          Test Endpoint
        </button>

        <button
          onClick={handleCheck}
          disabled={loading}
          className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Check for Updates"}
        </button>

        <button
          onClick={handleClearCache}
          className="rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700"
        >
          Clear Update Cache
        </button>
      </div>

      {appInfo ? (
        <div className="mb-6 rounded-lg border border-white/10 bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-xl font-bold">App Info</h2>
          <pre className="overflow-auto rounded bg-black/40 p-3 text-sm">
            {JSON.stringify(appInfo, null, 2)}
          </pre>
        </div>
      ) : null}

      {status ? (
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
          <h2 className="mb-3 text-xl font-bold">Update Status</h2>
          <pre className="max-h-96 overflow-auto rounded bg-black/40 p-3 text-sm">
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
