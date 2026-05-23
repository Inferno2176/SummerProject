import { check } from '@tauri-apps/plugin-updater';

export async function checkForUpdates() {
  try {
    console.log('[Updater] Checking for updates...');
    
    const update = await check();

    if (update?.available) {
      console.log(`[Updater] Update available: ${update.version}`);
      console.log(`[Updater] Release notes: ${update.body}`);
      
      // Download and install the update
      // The app will automatically restart after installation
      await update.downloadAndInstall();
      console.log('[Updater] Update downloaded and installed. Restarting...');
    } else {
      console.log('[Updater] No updates available');
    }
  } catch (error) {
    console.error('[Updater] Error checking for updates:', error);
  }
}

export async function checkForUpdatesInBackground() {
  // Check for updates on a schedule (every 24 hours)
  const lastCheck = localStorage.getItem('lastUpdateCheck');
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (!lastCheck || now - parseInt(lastCheck) > oneDay) {
    localStorage.setItem('lastUpdateCheck', now.toString());
    await checkForUpdates();
  }
}
