import { createContext } from "react";
import type { UpdateInfo, DownloadProgress } from "@/services/updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

export interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  showNotification: boolean;
}

export interface UpdateContextValue extends UpdateState {
  checkUpdate: (showToast?: boolean) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  restart: () => Promise<void>;
  dismissNotification: () => void;
}

export const UpdateContext = createContext<UpdateContextValue | null>(null);
