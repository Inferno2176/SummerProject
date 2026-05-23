import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../../components/sidebar";
import Topbar from "../../components/topbar";
import { checkForUpdatesInBackground } from "../../lib/updater";

export default function AppLayout() {
  useEffect(() => {
    // Check for updates on app launch
    checkForUpdatesInBackground();
  }, []);

  return (
    <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <Topbar />

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}