use serde::{Deserialize, Serialize};
use std::sync::{Mutex, MutexGuard, PoisonError};
use tauri::{async_runtime, AppHandle, Manager, State};
use tauri_plugin_store::StoreExt;

use crate::{terminal, worktree};

// 處理 mutex poison：即使 poisoned 也取得 guard（資料可能不一致但不會 panic）
fn lock_or_recover<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
  mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

const STORE_FILE: &str = "data.json";
const PROJECTS_KEY: &str = "projects";
const TASKS_KEY: &str = "tasks";
const SETTINGS_KEY: &str = "settings";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  #[serde(default)]
  pub llm_api_key: Option<String>,
  #[serde(default)]
  pub llm_base_url: Option<String>,
  #[serde(default)]
  pub llm_model: Option<String>,
  #[serde(default)]
  pub asr_model: Option<String>,
  #[serde(default)]
  pub asr_language: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
  pub id: String,
  pub name: String,
  pub path: Option<String>,
  #[serde(default, alias = "base_branch", skip_serializing)]
  pub base_branch: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
  pub id: String,
  pub project_id: String,
  pub title: String,
  pub description: String,
}

#[derive(Default)]
pub struct StoreState {
  pub projects: Mutex<Vec<Project>>,
  pub tasks: Mutex<Vec<Task>>,
  pub settings: Mutex<Settings>,
}

// 初始化：從 store 載入資料
pub fn init_store(app: &AppHandle) -> Result<(), String> {
  let store = app
    .store(STORE_FILE)
    .map_err(|e| format!("Failed to open store: {e}"))?;

  let state = app.state::<StoreState>();

  // 載入 projects
  if let Some(projects) = store.get(PROJECTS_KEY) {
    if let Ok(projects) = serde_json::from_value::<Vec<Project>>(projects) {
      *lock_or_recover(&state.projects) = projects;
    }
  }

  // 載入 tasks
  if let Some(tasks) = store.get(TASKS_KEY) {
    if let Ok(tasks) = serde_json::from_value::<Vec<Task>>(tasks) {
      *lock_or_recover(&state.tasks) = tasks;
    }
  }

  // 載入 settings
  if let Some(settings) = store.get(SETTINGS_KEY) {
    if let Ok(settings) = serde_json::from_value::<Settings>(settings) {
      *lock_or_recover(&state.settings) = settings;
    }
  }

  Ok(())
}

// 儲存到 store
fn save_to_store(app: &AppHandle, state: &State<StoreState>) -> Result<(), String> {
  let store = app
    .store(STORE_FILE)
    .map_err(|e| format!("Failed to open store: {e}"))?;

  let projects = lock_or_recover(&state.projects).clone();
  let tasks = lock_or_recover(&state.tasks).clone();
  let settings = lock_or_recover(&state.settings).clone();

  store.set(
    PROJECTS_KEY,
    serde_json::to_value(&projects).map_err(|e| e.to_string())?,
  );
  store.set(
    TASKS_KEY,
    serde_json::to_value(&tasks).map_err(|e| e.to_string())?,
  );
  store.set(
    SETTINGS_KEY,
    serde_json::to_value(&settings).map_err(|e| e.to_string())?,
  );
  store.save().map_err(|e| format!("Failed to save: {e}"))?;

  Ok(())
}

// === Project Commands ===

#[tauri::command]
pub fn get_projects(state: State<StoreState>) -> Vec<Project> {
  lock_or_recover(&state.projects).clone()
}

#[tauri::command]
pub fn add_project(
  app: AppHandle,
  state: State<StoreState>,
  name: String,
  path: Option<String>,
) -> Result<Project, String> {
  let project = Project {
    id: uuid::Uuid::new_v4().to_string(),
    name,
    path,
    base_branch: None,
  };

  lock_or_recover(&state.projects).push(project.clone());
  save_to_store(&app, &state)?;

  Ok(project)
}

#[tauri::command]
pub fn delete_project(app: AppHandle, state: State<StoreState>, id: String) -> Result<(), String> {
  lock_or_recover(&state.projects).retain(|p| p.id != id);
  lock_or_recover(&state.tasks).retain(|t| t.project_id != id);
  save_to_store(&app, &state)?;
  Ok(())
}

// === Task Commands ===

#[tauri::command]
pub fn get_tasks(state: State<StoreState>) -> Vec<Task> {
  lock_or_recover(&state.tasks).clone()
}

#[tauri::command]
pub fn get_tasks_by_project(state: State<StoreState>, project_id: String) -> Vec<Task> {
  lock_or_recover(&state.tasks)
    .iter()
    .filter(|t| t.project_id == project_id)
    .cloned()
    .collect()
}

#[tauri::command]
pub fn add_task(
  app: AppHandle,
  state: State<StoreState>,
  project_id: String,
  title: String,
  description: String,
) -> Result<Task, String> {
  let task = Task {
    id: uuid::Uuid::new_v4().to_string(),
    project_id,
    title,
    description,
  };

  lock_or_recover(&state.tasks).push(task.clone());
  save_to_store(&app, &state)?;

  Ok(task)
}

#[tauri::command]
pub async fn delete_task(
  app: AppHandle,
  state: State<'_, StoreState>,
  id: String,
) -> Result<(), String> {
  delete_task_atomic(app, state, id).await
}

#[tauri::command]
pub async fn delete_task_atomic(
  app: AppHandle,
  state: State<'_, StoreState>,
  id: String,
) -> Result<(), String> {
  let task = lock_or_recover(&state.tasks)
    .iter()
    .find(|t| t.id == id)
    .cloned()
    .ok_or_else(|| format!("Task not found: {id}"))?;

  let project_path = lock_or_recover(&state.projects)
    .iter()
    .find(|p| p.id == task.project_id)
    .and_then(|p| p.path.clone());

  terminal::terminal_kill_task_sessions(task.id.clone())
    .map_err(|e| format!("Failed to kill terminals for task {}: {e}", task.id))?;

  let app_clone = app.clone();
  let task_id_clone = task.id.clone();
  let project_id_clone = task.project_id.clone();
  let project_path_clone = project_path.clone();

  async_runtime::spawn_blocking(move || {
    worktree::remove_task_copy(
      &app_clone,
      &task_id_clone,
      &project_id_clone,
      project_path_clone.as_deref(),
    )
  })
  .await
  .map_err(|e| format!("Failed to spawn delete task: {e}"))?
  .map_err(|e| format!("Failed to cleanup task workspace for {}: {e}", task.id))?;

  let (removed_index, removed_task) = {
    let mut tasks = lock_or_recover(&state.tasks);
    let Some(index) = tasks.iter().position(|t| t.id == task.id) else {
      return Err(format!("Task metadata changed during delete: {}", task.id));
    };
    (index, tasks.remove(index))
  };

  if let Err(save_error) = save_to_store(&app, &state) {
    {
      let mut tasks = lock_or_recover(&state.tasks);
      if tasks.iter().all(|t| t.id != removed_task.id) {
        let insert_index = removed_index.min(tasks.len());
        tasks.insert(insert_index, removed_task);
      }
    }

    if let Err(rollback_error) = save_to_store(&app, &state) {
      return Err(format!(
        "Task workspace cleanup succeeded but deleting metadata failed: {save_error}; rollback also failed: {rollback_error}"
      ));
    }

    return Err(format!(
      "Task workspace cleanup succeeded but deleting metadata failed: {save_error}; metadata rollback applied"
    ));
  }

  Ok(())
}

// === Settings Commands ===

#[tauri::command]
pub fn get_settings(state: State<StoreState>) -> Settings {
  lock_or_recover(&state.settings).clone()
}

#[tauri::command]
pub fn update_settings(
  app: AppHandle,
  state: State<StoreState>,
  llm_api_key: Option<Option<String>>,
  llm_base_url: Option<Option<String>>,
  llm_model: Option<Option<String>>,
  asr_model: Option<Option<String>>,
  asr_language: Option<Option<String>>,
) -> Result<Settings, String> {
  let mut settings = lock_or_recover(&state.settings);

  if let Some(value) = llm_api_key {
    settings.llm_api_key = value;
  }

  if let Some(value) = llm_base_url {
    settings.llm_base_url = value;
  }

  if let Some(value) = llm_model {
    settings.llm_model = value;
  }

  if let Some(value) = asr_model {
    settings.asr_model = value;
  }

  if let Some(value) = asr_language {
    settings.asr_language = value;
  }

  let updated = settings.clone();
  drop(settings);
  save_to_store(&app, &state)?;
  Ok(updated)
}
