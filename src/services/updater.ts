import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

let pendingUpdate: Update | null = null;

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const update = await check();
    if (update) {
      pendingUpdate = update;
      return {
        version: update.version,
        currentVersion: update.currentVersion,
        body: update.body ?? undefined,
        date: update.date ?? undefined,
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to check for update:", error);
    throw error;
  }
}

export async function downloadAndInstallUpdate(
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  if (!pendingUpdate) {
    throw new Error("No pending update");
  }

  let downloaded = 0;
  let contentLength: number | null = null;

  await pendingUpdate.downloadAndInstall((event) => {
    switch (event.event) {
      case "Started":
        contentLength = event.data.contentLength ?? null;
        // Download started
        break;
      case "Progress":
        downloaded += event.data.chunkLength;
        if (onProgress) {
          onProgress({ downloaded, total: contentLength });
        }
        break;
      case "Finished":
        // Download finished
        break;
    }
  });

  pendingUpdate = null;
}

export async function restartApp(): Promise<void> {
  await relaunch();
}
