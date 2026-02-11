use fs_extra::dir::{self, CopyOptions};
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

/// 取得 worktrees 目錄
fn get_worktrees_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let app_data = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Failed to get app data dir: {e}"))?;
  Ok(app_data.join("worktrees"))
}

fn validate_workspace_segment(segment: &str, field_name: &str) -> Result<String, String> {
  let value = segment.trim();
  if value.is_empty() {
    return Err(format!("{field_name} cannot be empty"));
  }

  if value == "." || value == ".." {
    return Err(format!("Invalid {field_name}: traversal is not allowed"));
  }

  if value.contains('/') || value.contains('\\') {
    return Err(format!(
      "Invalid {field_name}: path separator is not allowed"
    ));
  }

  Ok(value.to_string())
}

fn normalize_path(path: &Path) -> PathBuf {
  let mut normalized = PathBuf::new();

  for component in path.components() {
    match component {
      Component::CurDir => {}
      Component::ParentDir => {
        normalized.pop();
      }
      _ => normalized.push(component.as_os_str()),
    }
  }

  normalized
}

fn ensure_path_within_root(root: &Path, path: &Path) -> Result<(), String> {
  let normalized_root = normalize_path(root);
  let normalized_target = normalize_path(path);

  if !normalized_target.starts_with(&normalized_root) {
    return Err(format!(
      "Unsafe path rejected: {} is outside managed root {}",
      normalized_target.display(),
      normalized_root.display()
    ));
  }

  Ok(())
}

fn ensure_within_worktrees_root(app: &AppHandle, path: &Path) -> Result<(), String> {
  let root = get_worktrees_dir(app)?;
  ensure_path_within_root(&root, path)
}

fn resolve_project_workspace_path(
  worktrees_root: &Path,
  project_id: &str,
) -> Result<PathBuf, String> {
  let project_id = validate_workspace_segment(project_id, "project_id")?;
  Ok(normalize_path(&worktrees_root.join(&project_id)))
}

fn resolve_task_workspace_path(
  worktrees_root: &Path,
  project_id: &str,
  task_id: &str,
) -> Result<PathBuf, String> {
  let task_id = validate_workspace_segment(task_id, "task_id")?;
  Ok(resolve_project_workspace_path(worktrees_root, project_id)?.join(&task_id))
}

/// 取得特定 project 的工作目錄根路徑
fn get_project_workspace_path(app: &AppHandle, project_id: &str) -> Result<PathBuf, String> {
  let worktrees_root = get_worktrees_dir(app)?;
  resolve_project_workspace_path(&worktrees_root, project_id)
}

/// 取得特定 task 的工作目錄路徑（canonical: worktrees/{project_id}/{task_id}）
fn get_task_workspace_path(
  app: &AppHandle,
  project_id: &str,
  task_id: &str,
) -> Result<PathBuf, String> {
  let worktrees_root = get_worktrees_dir(app)?;
  resolve_task_workspace_path(&worktrees_root, project_id, task_id)
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
  project_id: String,
  project_path: String,
  base_branch: Option<String>,
) -> Result<String, String> {
  // 檢查是否為 git repo
  if !is_git_repo(&project_path) {
    return Ok(project_path);
  }

  let worktree_path = get_task_workspace_path(&app, &project_id, &task_id)?;
  ensure_within_worktrees_root(&app, &worktree_path)?;

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
  project_id: String,
  project_path: Option<String>,
) -> Result<(), String> {
  let worktree_path = get_task_workspace_path(&app, &project_id, &task_id)?;
  ensure_within_worktrees_root(&app, &worktree_path)?;

  if !worktree_path.exists() {
    return Ok(());
  }

  // 如果有 project_path 且是 git repo，用 git worktree remove
  if let Some(ref path) = project_path {
    if is_git_repo(path) {
      let _ = Command::new("git")
        .current_dir(path)
        .args([
          "worktree",
          "remove",
          "--force",
          worktree_path.to_string_lossy().as_ref(),
        ])
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
  project_id: String,
  project_path: Option<String>,
) -> Result<Option<String>, String> {
  // 檢查是否有 worktree
  let worktree_path = get_task_workspace_path(&app, &project_id, &task_id)?;
  if worktree_path.exists() {
    return Ok(Some(worktree_path.to_string_lossy().to_string()));
  }

  // 沒有 worktree，返回 project path
  Ok(project_path)
}

/// 複製 project 到 worktrees 目錄，並發送進度事件
#[tauri::command]
pub fn copy_project(
  app: AppHandle,
  project_id: String,
  project_path: String,
) -> Result<String, String> {
  let dest_path = get_project_workspace_path(&app, &project_id)?;
  ensure_within_worktrees_root(&app, &dest_path)?;

  // 如果目標目錄已存在，先刪除
  if dest_path.exists() {
    std::fs::remove_dir_all(&dest_path)
      .map_err(|e| format!("Failed to remove existing directory: {e}"))?;
  }

  // 複製選項
  let mut options = CopyOptions::new();
  options.content_only = false; // 包含 .git 等 hidden files
  options.copy_inside = false;

  // 計算總檔案數量（進度估算）
  let source_path = PathBuf::from(&project_path);
  let total_files = count_files(&source_path).map_err(|e| format!("Failed to count files: {e}"))?;

  // 設置進度回調
  let mut current_files = 0usize;
  let app_handle = app.clone();
  let project_id_clone = project_id.clone();

  let handler = |_process_info: dir::TransitProcess| {
    current_files += 1;

    // 計算進度百分比 (0-100)
    let progress = if total_files > 0 {
      ((current_files as f64 / total_files as f64) * 100.0).min(100.0) as u32
    } else {
      100
    };

    // 發送進度事件
    let _ = app_handle.emit(
      "copy-progress",
      serde_json::json!({
        "project_id": project_id_clone,
        "progress": progress,
        "copied_files": current_files,
        "total_files": total_files
      }),
    );

    dir::TransitProcessResult::ContinueOrAbort
  };

  // 執行複製
  dir::copy_with_progress(&project_path, &dest_path, &options, handler)
    .map_err(|e| format!("Failed to copy project: {e}"))?;

  Ok(dest_path.to_string_lossy().to_string())
}

/// 計算目錄中的檔案數量（遞歸）
fn count_files(dir: &PathBuf) -> std::io::Result<usize> {
  let mut count = 0usize;

  for entry in std::fs::read_dir(dir)? {
    let entry = entry?;
    let path = entry.path();

    if path.is_dir() {
      // 跳過 node_modules 等大目錄以加快計算
      if let Some(name) = path.file_name() {
        let name = name.to_string_lossy();
        if name == "node_modules" || name == ".git" || name == "target" {
          continue;
        }
      }
      count += count_files(&path)?;
    } else if path.is_file() {
      count += 1;
    }
  }

  Ok(count)
}

#[cfg(test)]
mod tests {
  use super::{ensure_path_within_root, resolve_task_workspace_path};
  use std::path::Path;

  #[test]
  fn resolves_unique_task_paths_in_same_project() {
    let root = Path::new("/tmp/novercode/worktrees");
    let task_a = resolve_task_workspace_path(root, "project-123", "task-a").unwrap();
    let task_b = resolve_task_workspace_path(root, "project-123", "task-b").unwrap();

    assert_ne!(task_a, task_b);
    assert!(task_a.starts_with(root));
    assert!(task_b.starts_with(root));
  }

  #[test]
  fn rejects_paths_outside_managed_root() {
    let root = Path::new("/tmp/novercode/worktrees");
    let outside = Path::new("/tmp/novercode/escape");

    let result = ensure_path_within_root(root, outside);
    assert!(result.is_err());
  }
}
