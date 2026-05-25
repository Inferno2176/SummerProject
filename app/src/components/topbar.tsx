import { useThemeStore } from "../store/theme-store";
import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { AgentOption, getAvailableAgents, getCurrentModel, setAgentByModel } from "../lib/ai-preferences";
import { invoke } from "@tauri-apps/api/core";


export default function Topbar() {
  const { theme, setTheme } = useThemeStore();
  const [model, setModel] = useState(getCurrentModel());
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [cpuUsage, setCpuUsage] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => setModel(getCurrentModel());
    window.addEventListener("ai-preferences-updated", sync);
    return () => window.removeEventListener("ai-preferences-updated", sync);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadAgents = async () => {
      const items = await getAvailableAgents();
      if (!mounted) return;
      setAgents(items);
      if (items.length && !items.some((x) => x.model === getCurrentModel())) {
        const fallback = items.find((x) => x.recommended) || items[0];
        setAgentByModel(fallback.model, fallback.name);
      }
    };
    void loadAgents();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const updateCpu = async () => {
      try {
        const usage = await invoke<number>("get_cpu_usage");
        if (mounted) {
          setCpuUsage(usage);
        }
      } catch {
        if (mounted) {
          setCpuUsage(null);
        }
      }
    };

    void updateCpu();
    const timer = window.setInterval(() => {
      void updateCpu();
    }, 2500);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="flex h-20 items-center justify-between border-b border-white/5 bg-[var(--surface)] px-6">
      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 w-[320px]">
        <Search
          size={18}
          className="text-[var(--muted)]"
        />

        <input
          placeholder="Search anything..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            CPU
          </p>
          <p className="text-sm font-medium">
            {cpuUsage === null ? "--" : `${Math.round(cpuUsage)}%`}
          </p>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
            Agent
          </p>
          <select
            value={model}
            onChange={(event) => {
              const selected = agents.find((item) => item.model === event.target.value);
              setAgentByModel(event.target.value, selected?.name);
              setModel(event.target.value);
            }}
            className="bg-transparent text-sm outline-none"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.model} className="bg-[var(--surface)]">
                {agent.name} ({agent.model})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center rounded-xl border border-white/5 bg-white/[0.03] p-1">
          <button
            onClick={() => setTheme("light")}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
              theme === "light"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <Sun size={18} />
          </button>

          <button
            onClick={() => setTheme("dark")}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
              theme === "dark"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)]"
            }`}
          >
            <Moon size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] font-semibold text-black">
            MJ
          </div>

          <div>
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
