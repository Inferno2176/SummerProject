import { useThemeStore } from "../store/theme-store";
import { useSidebarStore } from "../store/sidebar-store";

import {
  Moon,
  Sun,
  Menu,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  AgentOption,
  getAvailableAgents,
  getCurrentModel,
  setAgentByModel,
} from "../lib/ai-preferences";

import { invoke } from "@tauri-apps/api/core";

export default function Topbar() {
  const { theme, setTheme } =
    useThemeStore();

  const { toggleSidebar } =
    useSidebarStore();

  const [model, setModel] =
    useState("");

  const [agents, setAgents] =
    useState<AgentOption[]>([]);

  const [cpuUsage, setCpuUsage] =
    useState<number | null>(null);

  /*
    SYNC MODEL
  */
  useEffect(() => {
    let mounted = true;

    const sync =
      async () => {
        const current =
          await getCurrentModel();

        if (mounted) {
          setModel(current);
        }
      };

    void sync();

    window.addEventListener(
      "ai-preferences-updated",
      sync
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "ai-preferences-updated",
        sync
      );
    };
  }, []);

  /*
    LOAD AGENTS
  */
  useEffect(() => {
    let mounted = true;

    const loadAgents =
      async () => {
        const items =
          await getAvailableAgents();

        const currentModel =
          await getCurrentModel();

        if (!mounted) {
          return;
        }

        setAgents(items);

        if (
          items.length &&
          !items.some(
            (x) =>
              x.model === currentModel
          )
        ) {
          const fallback =
            items.find(
              (x) => x.recommended
            ) || items[0];

          await setAgentByModel(
            fallback.model,
            fallback.name
          );

          setModel(
            fallback.model
          );
        } else {
          setModel(
            currentModel
          );
        }
      };

    void loadAgents();

    return () => {
      mounted = false;
    };
  }, []);

  /*
    CPU MONITOR
  */
  useEffect(() => {
    let mounted = true;

    const updateCpu =
      async () => {
        try {
          const usage =
            await invoke<number>(
              "get_cpu_usage"
            );

          if (mounted) {
            setCpuUsage(
              usage
            );
          }
        } catch {
          if (mounted) {
            setCpuUsage(
              null
            );
          }
        }
      };

    void updateCpu();

    const timer =
      window.setInterval(
        () => {
          void updateCpu();
        },
        2500
      );

    return () => {
      mounted = false;

      window.clearInterval(
        timer
      );
    };
  }, []);

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/5 bg-[var(--surface)] px-6">
      {/* LEFT */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={
            toggleSidebar
          }
          className="rounded-lg p-2 text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)] lg:hidden"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="hidden min-w-0 flex-1 lg:flex">
          <div className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Active AI Agent
              </p>

              <p className="mt-1 text-sm font-medium text-[var(--text)]">
                {
                  agents.find(
                    (x) =>
                      x.model ===
                      model
                  )?.name ||
                  "No Agent Selected"
                }
              </p>
            </div>

            <div className="w-[300px]">
              <select
                value={model}
                onChange={async (
                  event
                ) => {
                  const selected =
                    agents.find(
                      (
                        item
                      ) =>
                        item.model ===
                        event
                          .target
                          .value
                    );

                  await setAgentByModel(
                    event
                      .target
                      .value,
                    selected?.name
                  );

                  setModel(
                    event
                      .target
                      .value
                  );
                }}
                className="w-full rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-sm outline-none transition hover:border-white/10"
              >
                {agents.map(
                  (
                    agent
                  ) => (
                    <option
                      key={
                        agent.id
                      }
                      value={
                        agent.model
                      }
                      className="bg-[var(--surface)]"
                    >
                      {
                        agent.name
                      }{" "}
                      (
                      {
                        agent.model
                      }
                      )
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="ml-6 flex items-center gap-4">
        {/* CPU */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            CPU
          </p>

          <p className="mt-1 text-sm font-semibold">
            {cpuUsage ===
            null
              ? "--"
              : `${Math.round(
                  cpuUsage
                )}%`}
          </p>
        </div>

        {/* THEME */}
        <div className="flex items-center rounded-2xl border border-white/5 bg-white/[0.03] p-1">
          <button
            onClick={() =>
              setTheme(
                "light"
              )
            }
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              theme ===
              "light"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <Sun size={18} />
          </button>

          <button
            onClick={() =>
              setTheme(
                "dark"
              )
            }
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
              theme ===
              "dark"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <Moon size={18} />
          </button>
        </div>

        {/* PROFILE */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)] font-semibold text-black">
            MJ
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-medium">
              Matta Joshi
            </p>

            <p className="text-xs text-[var(--muted)]">
              Local Profile
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}