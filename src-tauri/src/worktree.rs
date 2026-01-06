use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// 取得 worktrees 目錄
fn get_worktrees_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {e}"))?;
    Ok(app_data.join("worktrees"))
}

/// 取得特定 task 的 worktree 路徑
fn get_task_worktree_path(app: &AppHandle, project_name: &str, task_id: &str) -> Result<PathBuf, String> {
    Ok(get_worktrees_dir(app)?.join(project_name).join(task_id))
}

/// 檢查路徑是否為 git repo
fn is_git_repo(path: &str) -> bool {
    let git_dir = PathBuf::from(path).join(".git");
    git_dir.exists()
}

/// 嘗試執行 git worktree add 命令
fn try_worktree_add(project_path: &str, args: &[&str]) -> Result<bool, String> {
    let output = Command::new("git")
        .current_dir(project_path)
        .arg("worktree")
        .arg("add")
        .args(args)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;
    Ok(output.status.success())
}

/// 建立 git worktree
#[tauri::command]
pub fn create_worktree(
    app: AppHandle,
    task_id: String,
    project_name: String,
    project_path: String,
    base_branch: Option<String>,
) -> Result<String, String> {
    // 檢查是否為 git repo
    if !is_git_repo(&project_path) {
        return Ok(project_path);
    }

    let worktree_path = get_task_worktree_path(&app, &project_name, &task_id)?;

    // 如果 worktree 已存在，直接返回
    if worktree_path.exists() {
        return Ok(worktree_path.to_string_lossy().to_string());
    }

    // 確保 worktrees 目錄存在
    let worktrees_dir = get_worktrees_dir(&app)?;
    std::fs::create_dir_all(&worktrees_dir)
        .map_err(|e| format!("Failed to create worktrees dir: {e}"))?;

    let new_branch = format!("task/{}", &task_id[..8]);
    let base = base_branch.unwrap_or_else(|| "main".to_string());
    let wt_path = worktree_path.to_string_lossy();

    // 先 fetch 確保有最新的 remote branch
    let _ = Command::new("git")
        .current_dir(&project_path)
        .args(["fetch", "origin", &base])
        .output();

    // 策略陣列：依序嘗試不同方法建立 worktree
    let strategies: &[&[&str]] = &[
        // 1. 新 branch 基於 origin/base
        &["-b", &new_branch, &wt_path, &format!("origin/{base}")],
        // 2. 新 branch 基於本地 base
        &["-b", &new_branch, &wt_path, &base],
        // 3. 使用已存在的 branch
        &[&wt_path, &new_branch],
        // 4. Detached HEAD（最後手段）
        &["--detach", &wt_path],
    ];

    for strategy in strategies {
        if try_worktree_add(&project_path, strategy)? {
            return Ok(worktree_path.to_string_lossy().to_string());
        }
    }

    Err("Failed to create worktree: all strategies exhausted".to_string())
}

/// 移除 git worktree
#[tauri::command]
pub fn remove_worktree(
    app: AppHandle,
    task_id: String,
    project_name: String,
    project_path: Option<String>,
) -> Result<(), String> {
    let worktree_path = get_task_worktree_path(&app, &project_name, &task_id)?;

    if !worktree_path.exists() {
        return Ok(());
    }

    // 如果有 project_path 且是 git repo，用 git worktree remove
    if let Some(ref path) = project_path {
        if is_git_repo(path) {
            let _ = Command::new("git")
                .current_dir(path)
                .args(["worktree", "remove", "--force", worktree_path.to_string_lossy().as_ref()])
                .output();
        }
    }

    // 確保目錄被刪除
    if worktree_path.exists() {
        std::fs::remove_dir_all(&worktree_path)
            .map_err(|e| format!("Failed to remove worktree dir: {e}"))?;
    }

    Ok(())
}

/// 取得 task 的工作目錄（worktree 或原始路徑）
#[tauri::command]
pub fn get_task_working_dir(
    app: AppHandle,
    task_id: String,
    project_name: String,
    project_path: Option<String>,
) -> Result<Option<String>, String> {
    // 檢查是否有 worktree
    let worktree_path = get_task_worktree_path(&app, &project_name, &task_id)?;
    if worktree_path.exists() {
        return Ok(Some(worktree_path.to_string_lossy().to_string()));
    }

    // 沒有 worktree，返回 project path
    Ok(project_path)
}
