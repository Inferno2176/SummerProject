import { useThemeStore } from "../store/theme-store";
import { Moon, Search, Sun } from "lucide-react";


export default function Topbar() {
  const { theme, setTheme } = useThemeStore();

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