import {
    Briefcase,
    FileText,
    Home,
    Settings,
    Sparkles,
    UserCheck,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

const items = [
    {
        label: "Dashboard",
        icon: Home,
        path: "/app/dashboard",
    },
    {
        label: "ATS Analysis",
        icon: Sparkles,
        path: "/app/ats",
    },
    {
        label: "Jobs",
        icon: Briefcase,
        path: "/app/jobs",
    },
    {
        label: "Applied",
        icon: UserCheck,
        path: "/app/applied",
    },
    {
        label: "Interview",
        icon: FileText,
        path: "/app/interview",
    },
    {
        label: "Settings",
        icon: Settings,
        path: "/app/settings",
    },
];

export default function Sidebar() {
    return (
        <aside className="hidden w-[270px] border-r border-white/5 bg-[var(--surface)] lg:flex lg:flex-col">
            <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
                <img
                    src={logo}
                    alt="CareerForges"
                    className="h-10 w-10 object-contain"
                />

                <div>
                    <h1 className="font-display text-lg font-bold tracking-tight">
                        CareerForges
                    </h1>

                    <p className="text-xs text-[var(--muted)]">
                        Local AI Career OS
                    </p>
                </div>
            </div>

            <nav className="flex flex-1 flex-col gap-2 p-4">
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${isActive
                                    ? "bg-[var(--accent)] text-white"
                                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                                }`
                            }
                        >
                            <Icon size={18} />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="border-t border-white/5 p-4">
                <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="text-sm font-medium">
                        Ollama Connected
                    </p>

                    <p className="mt-1 text-xs text-[var(--muted)]">
                        llama3:8b
                    </p>
                </div>
            </div>
        </aside>
    );
}