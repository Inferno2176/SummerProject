import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

import { router } from "./router";

import LaunchLoader from "../components/launch-loader";
import { DialogProvider } from "../components/ui/dialog";
import type { Email } from "@/lib/db/models";

export default function AppBootstrap() {
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    // Listen for new jobs
    const unlistenJobs = listen<number>("new-jobs-discovered", async (event) => {
      const count = event.payload;
      
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === 'granted';
      }

      if (permission) {
        sendNotification({
          title: 'New Opportunities Found!',
          body: `CareerForges found ${count} new jobs matching your profile.`,
        });
      }
    });

    // Listen for new emails
    const unlistenEmails = listen<Email>("new-email-received", async (event) => {
      const email = event.payload;
      
      let permission = await isPermissionGranted();
      if (!permission) {
        permission = await requestPermission() === 'granted';
      }

      if (permission) {
        sendNotification({
          title: 'New Career Email',
          body: `Recruiter from ${email.sender} reached out regarding "${email.subject}"`,
        });
      }
    });

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1800);

    return () => {
      clearTimeout(timer);
      unlistenJobs.then(u => u());
      unlistenEmails.then(u => u());
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg)]">
        <LaunchLoader />
      </main>
    );
  }

  return (
    <DialogProvider>
      <RouterProvider router={router} />
    </DialogProvider>
  );
}
