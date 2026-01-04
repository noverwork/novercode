import { useState } from "react";

export type Stage = "planning" | "implementation" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  stage: Stage;
}

const STAGES: Stage[] = ["planning", "implementation", "review", "done"];

export function useKanban() {
  const [tasks, setTasks] = useState<Task[]>([]);

  const addTask = (title: string, description: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description,
      stage: "planning",
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const moveTask = (taskId: string, newStage: Stage) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, stage: newStage } : task
      )
    );
  };

  const getTasksByStage = (stage: Stage): Task[] => {
    return tasks.filter((task) => task.stage === stage);
  };

  return {
    tasks,
    addTask,
    deleteTask,
    moveTask,
    getTasksByStage,
    stages: STAGES,
  };
}
