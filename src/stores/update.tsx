import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  restartApp,
  type UpdateInfo,
  type DownloadProgress,
} from "@/services/updater";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "error";

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  error: string | null;
  showNotification: boolean;
}

interface UpdateContextValue extends UpdateState {
  checkUpdate: (showToast?: boolean) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  restart: () => Promise<void>;
  dismissNotification: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 每小時檢查一次
const INITIAL_CHECK_DELAY_MS = 5000; // 啟動 5 秒後首次檢查

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UpdateState>({
    status: "idle",
    updateInfo: null,
    downloadProgress: null,
    error: null,
    showNotification: false,
  });

  const checkUpdate = useCallback(async (showToast = false) => {
    setState((prev) => ({
      ...prev,
      status: "checking",
      error: null,
    }));

    try {
      const info = await checkForUpdate();
      if (info) {
        setState((prev) => ({
          ...prev,
          status: "available",
          updateInfo: info,
          showNotification: true,
        }));
        if (showToast) {
          console.log(`New version available: v${info.version}`);
        }
      } else {
        setState((prev) => ({
          ...prev,
          status: "idle",
        }));
        if (showToast) {
          console.log("Already up to date");
        }
      }
    } catch (err) {
      console.error("Failed to check for update:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to check for update";
      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMsg,
      }));
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      status: "downloading",
      downloadProgress: null,
    }));

    try {
      await downloadAndInstallUpdate((progress) => {
        setState((prev) => ({
          ...prev,
          downloadProgress: progress,
        }));
      });
      setState((prev) => ({
        ...prev,
        status: "ready",
        showNotification: true,
      }));
    } catch (err) {
      console.error("Failed to download update:", err);
      let errorMsg = "Failed to download update";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMsg,
      }));
    }
  }, []);

  const restart = useCallback(async () => {
    await restartApp();
  }, []);

  const dismissNotification = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showNotification: false,
    }));
  }, []);

  // 應用啟動時自動檢查更新
  useEffect(() => {
    // 首次延遲檢查
    const initialTimeout = setTimeout(() => {
      checkUpdate();
    }, INITIAL_CHECK_DELAY_MS);

    // 定期檢查
    const interval = setInterval(() => {
      checkUpdate();
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkUpdate]);

  return (
    <UpdateContext.Provider
      value={{
        ...state,
        checkUpdate,
        downloadUpdate,
        restart,
        dismissNotification,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate(): UpdateContextValue {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdate must be used within an UpdateProvider");
  }
  return context;
}
