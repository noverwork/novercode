use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// 取得 worktrees 目錄
fn get_worktrees_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
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

/// 建立 git worktree
#[tauri::command]
pub fn create_worktree(
    app: AppHandle,
    task_id: String,
    project_name: String,
    project_path: String,
    branch_name: Option<String>,
) -> Result<String, String> {
    // 檢查是否為 git repo
    if !is_git_repo(&project_path) {
        // 不是 git repo，直接返回原路徑
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
        .map_err(|e| format!("Failed to create worktrees dir: {}", e))?;

    // 決定 branch 名稱
    let branch = branch_name.unwrap_or_else(|| format!("task/{}", &task_id[..8]));

    // 嘗試建立新 branch 的 worktree
    let output = Command::new("git")
        .current_dir(&project_path)
        .args([
            "worktree",
            "add",
            "-b",
            &branch,
            worktree_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|e| format!("Failed to run git: {}", e))?;

    if !output.status.success() {
        // 如果建立新 branch 失敗，嘗試不建立新 branch（可能 branch 已存在）
        let output2 = Command::new("git")
            .current_dir(&project_path)
            .args([
                "worktree",
                "add",
                worktree_path.to_string_lossy().as_ref(),
                &branch,
            ])
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        if !output2.status.success() {
            // 最後嘗試：使用 HEAD
            let output3 = Command::new("git")
                .current_dir(&project_path)
                .args([
                    "worktree",
                    "add",
                    "--detach",
                    worktree_path.to_string_lossy().as_ref(),
                ])
                .output()
                .map_err(|e| format!("Failed to run git: {}", e))?;

            if !output3.status.success() {
                return Err(format!(
                    "Failed to create worktree: {}",
                    String::from_utf8_lossy(&output3.stderr)
                ));
            }
        }
    }

    Ok(worktree_path.to_string_lossy().to_string())
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
            .map_err(|e| format!("Failed to remove worktree dir: {}", e))?;
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
