import { useState } from "react";

export interface Task {
  id: string;
  title: string;
  description: string;
}

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);

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
  };
}
