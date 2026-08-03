import { useThemeStore } from "../store/theme-store";
import { useSidebarStore } from "../store/sidebar-store";
import { useNavigate } from "react-router-dom";

import {
  Moon,
  Sun,
  Menu,
  Cpu,
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
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { theme, setTheme } =
    useThemeStore();

  const { toggleSidebar } =
    useSidebarStore();

  const userProfile = JSON.parse(localStorage.getItem("user_profile") || '{"name":"User"}');
  const nameParts = userProfile.name.split(" ");
  const firstName = nameParts[0];
  const initials = nameParts.length > 1 
    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() 
    : firstName.slice(0, 2).toUpperCase();

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
    <header className="flex h-[72px] items-center justify-between bg-[var(--surface)] px-6">

      {/* LEFT */}
      <div className="flex min-w-0 flex-1 items-center gap-4">

        <button
          onClick={toggleSidebar}
          className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)] lg:hidden"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-chip flex h-12 flex-1 items-center justify-between rounded-2xl px-5">

          {/* LABEL */}
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Local AI
            </p>
          </div>

          {/* MODEL SELECT */}
          <div className="w-[360px]">
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
              className="h-11 w-full rounded-xl bg-[var(--surface-2)] px-4 text-sm text-[var(--text)] outline-none transition"
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

      {/* RIGHT */}
      <div className="ml-5 flex items-center gap-3">

        {/* CPU */}
        <div className="topbar-chip flex h-12 items-center gap-3 rounded-2xl px-4">

          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--muted)]">
            <Cpu size={15} />
          </div>

          <div className="flex flex-col leading-none">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              CPU
            </span>

            <span className="mt-1 text-sm font-semibold text-[var(--text)]">
              {cpuUsage ===
              null
                ? "--"
                : `${Math.round(
                    cpuUsage
                  )}%`}
            </span>
          </div>

        </div>

        {/* THEME */}
        <div className="topbar-chip flex h-12 items-center gap-1 rounded-2xl px-1">

          <button
            onClick={() =>
              setTheme(
                "light"
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              theme ===
              "light"
                ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/20"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <Sun size={17} />
          </button>

          <button
            onClick={() =>
              setTheme(
                "dark"
              )
            }
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
              theme ===
              "dark"
                ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/20"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            <Moon size={17} />
          </button>

        </div>

        {/* PROFILE */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="topbar-chip flex h-11 items-center gap-3 rounded-xl px-3 hover:bg-[var(--surface-2)] transition"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
              {initials}
            </div>

            <p className="text-sm font-medium text-[var(--text)]">
              {firstName}
            </p>
          </button>

          {menuOpen && (
            <>
              {/* Overlay backing to click outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setMenuOpen(false)} 
              />
              
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-1 pb-3 border-b border-[var(--border)]">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">Logged in as</p>
                  <p className="text-sm font-bold text-[var(--text)] truncate">{userProfile.name}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{userProfile.email || "localuser@hyrd.local"}</p>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      try {
                        await invoke("db_set_setting", { key: "active_user_email", value: "" });
                      } catch (e) {
                        console.error("Failed to clear active user setting", e);
                      }
                      localStorage.removeItem("user_session");
                      localStorage.removeItem("user_profile");
                      navigate("/login");
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

    </header>
  );
}