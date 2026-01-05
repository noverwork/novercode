import { useState, useEffect, useRef } from "react";
import { load, Store } from "@tauri-apps/plugin-store";

export interface Task {
  id: string;
  title: string;
  description: string;
}

const STORE_FILE = "tasks.json";
const TASKS_KEY = "tasks";

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const storeRef = useRef<Store | null>(null);

  // 載入 store
  useEffect(() => {
    load(STORE_FILE).then(async (store) => {
      storeRef.current = store;
      const saved = await store.get<Task[]>(TASKS_KEY);
      if (saved) {
        setTasks(saved);
      }
      setIsLoaded(true);
    });
  }, []);

  // tasks 變更時自動儲存
  useEffect(() => {
    if (!isLoaded || !storeRef.current) return;
    storeRef.current.set(TASKS_KEY, tasks);
    storeRef.current.save();
  }, [tasks, isLoaded]);

  const addTask = (title: string, description: string): string => {
    const id = crypto.randomUUID();
    const newTask: Task = { id, title, description };
    setTasks((prev) => [...prev, newTask]);
    return id;
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return {
    tasks,
    addTask,
    deleteTask,
    isLoaded,
  };
}
