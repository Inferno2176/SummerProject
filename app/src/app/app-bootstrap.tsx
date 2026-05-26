import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

import { router } from "./router";

import LaunchLoader from "../components/launch-loader";

export default function AppBootstrap() {
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);

    return () =>
      clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <LaunchLoader />
      </main>
    );
  }

  return (
    <RouterProvider router={router} />
  );
}