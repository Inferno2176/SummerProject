import { useState } from "react";

import { checkForUpdatesDebug, type UpdaterDebugStatus } from "../lib/updater";

export default function SettingsPage() {
  const [status, setStatus] = useState<UpdaterDebugStatus | null>(null);
  const [running, setRunning] = useState(false);

  async function runDebugCheck() {
    setRunning(true);
    const result = await checkForUpdatesDebug();
    setStatus(result);
    setRunning(false);
  }

  function resetThrottleAndCheck() {
    localStorage.removeItem("lastUpdateCheck");
    runDebugCheck();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">
        Settings
      </h1>

      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-semibold">Updater Debug</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use this in live builds to verify update endpoint, version detection, and errors.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runDebugCheck}
            disabled={running}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {running ? "Checking..." : "Check Updates Now"}
          </button>

          <button
            type="button"
            onClick={resetThrottleAndCheck}
            disabled={running}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-[var(--text)] disabled:opacity-60"
          >
            Reset 24h Throttle + Check
          </button>
        </div>

        {status && (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
            <p><strong>Checked At:</strong> {status.checkedAt}</p>
            <p><strong>Update Available:</strong> {status.available ? "Yes" : "No"}</p>
            {status.version && <p><strong>Version:</strong> {status.version}</p>}
            {status.error && <p className="text-red-300"><strong>Error:</strong> {status.error}</p>}
            {status.notes && <p className="mt-2 whitespace-pre-wrap text-[var(--muted)]">{status.notes}</p>}
          </div>
        )}
      </section>
    </div>
  );
}