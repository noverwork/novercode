use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "data.json";
const PROJECTS_KEY: &str = "projects";
const TASKS_KEY: &str = "tasks";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub path: Option<String>,
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
}

// 初始化：從 store 載入資料
pub fn init_store(app: &AppHandle) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let state = app.state::<StoreState>();

    // 載入 projects
    if let Some(projects) = store.get(PROJECTS_KEY) {
        if let Ok(projects) = serde_json::from_value::<Vec<Project>>(projects.clone()) {
            *state.projects.lock().unwrap() = projects;
        }
    }

    // 載入 tasks
    if let Some(tasks) = store.get(TASKS_KEY) {
        if let Ok(tasks) = serde_json::from_value::<Vec<Task>>(tasks.clone()) {
            *state.tasks.lock().unwrap() = tasks;
        }
    }

    Ok(())
}

// 儲存到 store
fn save_to_store(app: &AppHandle, state: &State<StoreState>) -> Result<(), String> {
    let store = app
        .store(STORE_FILE)
        .map_err(|e| format!("Failed to open store: {}", e))?;

    let projects = state.projects.lock().unwrap().clone();
    let tasks = state.tasks.lock().unwrap().clone();

    store.set(
        PROJECTS_KEY,
        serde_json::to_value(&projects).map_err(|e| e.to_string())?,
    );
    store.set(
        TASKS_KEY,
        serde_json::to_value(&tasks).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| format!("Failed to save: {}", e))?;

    Ok(())
}

// === Project Commands ===

#[tauri::command]
pub fn get_projects(state: State<StoreState>) -> Vec<Project> {
    state.projects.lock().unwrap().clone()
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
    };

    state.projects.lock().unwrap().push(project.clone());
    save_to_store(&app, &state)?;

    Ok(project)
}

#[tauri::command]
pub fn delete_project(
    app: AppHandle,
    state: State<StoreState>,
    id: String,
) -> Result<(), String> {
    {
        let mut projects = state.projects.lock().unwrap();
        projects.retain(|p| p.id != id);
    }
    {
        let mut tasks = state.tasks.lock().unwrap();
        tasks.retain(|t| t.project_id != id);
    }
    save_to_store(&app, &state)?;
    Ok(())
}

// === Task Commands ===

#[tauri::command]
pub fn get_tasks(state: State<StoreState>) -> Vec<Task> {
    state.tasks.lock().unwrap().clone()
}

#[tauri::command]
pub fn get_tasks_by_project(state: State<StoreState>, project_id: String) -> Vec<Task> {
    state
        .tasks
        .lock()
        .unwrap()
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

    state.tasks.lock().unwrap().push(task.clone());
    save_to_store(&app, &state)?;

    Ok(task)
}

#[tauri::command]
pub fn delete_task(
    app: AppHandle,
    state: State<StoreState>,
    id: String,
) -> Result<(), String> {
    {
        let mut tasks = state.tasks.lock().unwrap();
        tasks.retain(|t| t.id != id);
    }
    save_to_store(&app, &state)?;
    Ok(())
}
