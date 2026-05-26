import {
    Briefcase,
    FileText,
    Home,
    Settings,
    Sparkles,
    MessageSquare,
    Wrench,
    UserCheck,
    Users,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useSidebarStore } from "../store/sidebar-store";
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
        label: "Community",
        icon: Users,
        path: "/app/community",
    },
    {
        label: "Chat",
        icon: MessageSquare,
        path: "/app/chat",
    },
    {
        label: "Settings",
        icon: Settings,
        path: "/app/settings",
    }
];

export default function Sidebar() {
    const { isCollapsed, toggleSidebar } = useSidebarStore();

    return (
        <aside className={`hidden border-r border-white/5 bg-[var(--surface)] lg:flex lg:flex-col transition-all duration-300 ${isCollapsed ? "w-[80px]" : "w-[270px]"}`}>
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
                <div className="flex items-center gap-3">
                    <img
                        src={logo}
                        alt="CareerForges"
                        className="h-10 w-10 object-contain"
                    />

                    {!isCollapsed && (
                        <div>
                            <h1 className="font-display text-lg font-bold tracking-tight">
                                CareerForges
                            </h1>

                            <p className="text-xs text-[var(--muted)]">
                                Local AI Career Assistant
                            </p>
                        </div>
                    )}
                </div>

                {!isCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="rounded-lg p-1 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] transition"
                    >
                        <ChevronLeft size={18} />
                    </button>
                )}
            </div>

            <nav className={`flex flex-1 flex-col gap-2 ${isCollapsed ? "p-2 items-center" : "p-4"}`}>
                {items.map((item) => {
                    const Icon = item.icon;

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : ""}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${isCollapsed ? "px-3" : ""} ${isActive
                                    ? "bg-[var(--accent)] text-white"
                                    : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                                }`
                            }
                        >
                            <Icon size={18} className={!isCollapsed ? "" : ""} />
                            {!isCollapsed && item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="border-t border-white/5 p-4">
                <div className={`rounded-2xl bg-white/[0.03] ${isCollapsed ? "p-2 flex items-center justify-center" : "p-4"}`}>
                    {!isCollapsed ? (
                        <>
                            <p className="text-sm font-medium">
                                Ollama Connected
                            </p>

                            <p className="mt-1 text-xs text-[var(--muted)]">
                                llama3:8b
                            </p>
                        </>
                    ) : (
                        <div
                            title="Ollama Connected"
                            className="w-2 h-2 bg-green-500 rounded-full"
                        ></div>
                    )}
                </div>

                {isCollapsed && (
                    <button
                        onClick={toggleSidebar}
                        className="mt-4 flex w-full items-center justify-center rounded-lg p-2 text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] transition"
                    >
                        <ChevronRight size={18} />
                    </button>
                )}
            </div>
        </aside>
    );
}