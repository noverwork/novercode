import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';

export interface Project {
  id: string;
  name: string;
  path?: string;
  baseBranch?: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
}

export function useKanban() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 載入資料
  useEffect(() => {
    const load = async () => {
      try {
        const [loadedProjects, loadedTasks] = await Promise.all([
          invoke<Project[]>('get_projects'),
          invoke<Task[]>('get_tasks'),
        ]);
        setProjects(loadedProjects);
        setTasks(loadedTasks);
        if (loadedProjects.length > 0) {
          setCurrentProjectId(loadedProjects[0].id);
        }
      } catch (e) {
        console.error('Failed to load data:', e);
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  // Project operations
  const addProject = useCallback(
    async (name: string, path?: string, baseBranch?: string): Promise<string> => {
      const project = await invoke<Project>('add_project', { name, path, baseBranch });
      setProjects((prev) => [...prev, project]);
      setCurrentProjectId(project.id);
      return project.id;
    },
    []
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await invoke('delete_project', { id });
      setProjects((prev) => {
        const remaining = prev.filter((p) => p.id !== id);
        // 如果刪除的是當前選中的 project，選擇下一個
        if (currentProjectId === id) {
          setCurrentProjectId(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
      setTasks((prev) => prev.filter((t) => t.projectId !== id));
    },
    [currentProjectId]
  );

  // Task operations
  const addTask = useCallback(
    async (title: string, description: string): Promise<string> => {
      if (!currentProjectId) throw new Error('No project selected');
      const task = await invoke<Task>('add_task', {
        projectId: currentProjectId,
        title,
        description,
      });
      setTasks((prev) => [...prev, task]);
      return task.id;
    },
    [currentProjectId]
  );

  const deleteTask = useCallback(async (id: string) => {
    await invoke('delete_task', { id });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 取得某 project 的所有 tasks
  const getTasksByProject = useCallback(
    (projectId: string) => {
      return tasks.filter((t) => t.projectId === projectId);
    },
    [tasks]
  );

  // 當前 project 的 tasks
  const currentTasks = tasks.filter((t) => t.projectId === currentProjectId);
  const currentProject = projects.find((p) => p.id === currentProjectId) || null;

  return {
    // Projects
    projects,
    currentProject,
    currentProjectId,
    setCurrentProjectId,
    addProject,
    deleteProject,
    getTasksByProject,
    // Tasks
    tasks: currentTasks,
    addTask,
    deleteTask,
    // State
    isLoaded,
  };
}
