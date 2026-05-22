import { Outlet } from "react-router-dom";

export default function OnboardingLayout() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Outlet />
    </main>
  );
}