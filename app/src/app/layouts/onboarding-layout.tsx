import { useEffect, useState } from "react";

import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { invoke } from "@tauri-apps/api/core";

export default function OnboardingLayout() {
  const location = useLocation();

  const [loading, setLoading] =
    useState(true);

  const [
    onboardingCompleted,
    setOnboardingCompleted,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const isLocalCompleted = localStorage.getItem("onboarding_completed") === "true";
        const completed = await invoke<boolean>("db_is_onboarding_completed").catch(() => isLocalCompleted);

        if (!mounted) return;

        setOnboardingCompleted(completed || isLocalCompleted);
      } catch (err) {
        console.error("[Onboarding] bootstrap failed", err);
        const isLocalCompleted = localStorage.getItem("onboarding_completed") === "true";
        if (mounted) {
          setOnboardingCompleted(isLocalCompleted);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  /*
    LOADING
  */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <p className="text-sm text-[var(--muted)]">
          Loading...
        </p>
      </main>
    );
  }

  /*
    BLOCK APP ACCESS
    UNTIL ONBOARDING COMPLETE
  */
  if (
    !onboardingCompleted &&
    location.pathname.startsWith(
      "/app",
    )
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  /*
    REDIRECT COMPLETED USERS
    AWAY FROM ONBOARDING
  */
  if (
    onboardingCompleted &&
    !location.pathname.startsWith(
      "/app",
    )
  ) {
    return (
      <Navigate
        to="/app/dashboard"
        replace
      />
    );
  }

  /*
    NORMAL RENDER
  */
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Outlet />
    </main>
  );
}