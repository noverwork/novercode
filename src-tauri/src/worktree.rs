use fs_extra::dir::{self, CopyOptions};
use serde::Serialize;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use tauri::async_runtime;
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
    .map_err(|e| format!("Failed to create task workspace directory: {e}"))?;

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

  Err("Failed to create task copy: all strategies exhausted".to_string())
}

/// 移除 git worktree
pub fn remove_task_copy(
  app: &AppHandle,
  task_id: &str,
  project_id: &str,
  project_path: Option<&str>,
) -> Result<(), String> {
  let worktree_path = get_task_workspace_path(app, project_id, task_id)?;
  ensure_within_worktrees_root(app, &worktree_path)?;

  if !worktree_path.exists() {
    return Ok(());
  }

  // 如果有 project_path 且是 git repo，用 git worktree remove
  if let Some(path) = project_path {
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
      .map_err(|e| format!("Failed to remove task copy for {task_id}: {e}"))?;
  }

  Ok(())
}

/// 移除 git worktree
#[tauri::command]
pub fn remove_worktree(
  app: AppHandle,
  task_id: String,
  project_id: String,
  project_path: Option<String>,
) -> Result<(), String> {
  remove_task_copy(&app, &task_id, &project_id, project_path.as_deref())
}

/// 取得 task 的工作目錄（task copy 或 legacy project 路徑）
#[tauri::command]
pub fn get_task_working_dir(
  app: AppHandle,
  task_id: String,
  project_id: String,
  project_path: Option<String>,
) -> Result<Option<String>, String> {
  // Prefer task copy path first
  let task_copy_path = get_task_workspace_path(&app, &project_id, &task_id)?;
  if task_copy_path.exists() {
    return Ok(Some(task_copy_path.to_string_lossy().to_string()));
  }

  // Legacy fallback: older tasks may not have a copied workspace yet
  Ok(project_path)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
enum CopyProgressStatus {
  InProgress,
  Completed,
  Failed,
}

#[derive(Debug, Clone, Serialize)]
pub struct CopyTaskError {
  code: String,
  message: String,
  task_id: String,
  project_id: String,
  task_path: Option<String>,
  copied_files: usize,
  total_files: usize,
}

#[derive(Debug, Clone, Serialize)]
struct CopyProgressEvent {
  task_id: String,
  project_id: String,
  progress: u32,
  copied_files: usize,
  total_files: usize,
  status: CopyProgressStatus,
  task_path: String,
  error: Option<CopyTaskError>,
}

fn build_copy_task_error(
  code: &str,
  message: String,
  task_id: &str,
  project_id: &str,
  task_path: Option<&Path>,
  copied_files: usize,
  total_files: usize,
) -> CopyTaskError {
  CopyTaskError {
    code: code.to_string(),
    message,
    task_id: task_id.to_string(),
    project_id: project_id.to_string(),
    task_path: task_path.map(|p| p.to_string_lossy().to_string()),
    copied_files,
    total_files,
  }
}

fn emit_copy_progress_event(app: &AppHandle, event: CopyProgressEvent) {
  let _ = app.emit("copy-progress", event);
}

fn emit_copy_failure_event(app: &AppHandle, task_path: &Path, error: CopyTaskError) {
  let progress = if error.total_files > 0 {
    ((error.copied_files as f64 / error.total_files as f64) * 99.0).floor() as u32
  } else {
    0
  };

  emit_copy_progress_event(
    app,
    CopyProgressEvent {
      task_id: error.task_id.clone(),
      project_id: error.project_id.clone(),
      progress,
      copied_files: error.copied_files,
      total_files: error.total_files,
      status: CopyProgressStatus::Failed,
      task_path: task_path.to_string_lossy().to_string(),
      error: Some(error),
    },
  );
}

/// 複製 project 到 task 工作目錄，並發送 task-scoped 進度事件
#[tauri::command]
pub async fn copy_task(
  app: AppHandle,
  task_id: String,
  project_id: String,
  project_path: String,
) -> Result<String, CopyTaskError> {
  let source_path = PathBuf::from(&project_path);
  if !source_path.exists() || !source_path.is_dir() {
    let error = build_copy_task_error(
      "invalid_source_path",
      format!("Source path does not exist or is not a directory: {project_path}"),
      &task_id,
      &project_id,
      None,
      0,
      0,
    );
    emit_copy_progress_event(
      &app,
      CopyProgressEvent {
        task_id: task_id.clone(),
        project_id: project_id.clone(),
        progress: 0,
        copied_files: 0,
        total_files: 0,
        status: CopyProgressStatus::Failed,
        task_path: String::new(),
        error: Some(error.clone()),
      },
    );
    return Err(error);
  }

  let dest_path = get_task_workspace_path(&app, &project_id, &task_id).map_err(|message| {
    let error = build_copy_task_error(
      "invalid_task_workspace",
      message,
      &task_id,
      &project_id,
      None,
      0,
      0,
    );
    emit_copy_progress_event(
      &app,
      CopyProgressEvent {
        task_id: task_id.clone(),
        project_id: project_id.clone(),
        progress: 0,
        copied_files: 0,
        total_files: 0,
        status: CopyProgressStatus::Failed,
        task_path: String::new(),
        error: Some(error.clone()),
      },
    );
    error
  })?;

  ensure_within_worktrees_root(&app, &dest_path).map_err(|message| {
    let error = build_copy_task_error(
      "unsafe_destination",
      message,
      &task_id,
      &project_id,
      Some(&dest_path),
      0,
      0,
    );
    emit_copy_failure_event(&app, &dest_path, error.clone());
    error
  })?;

  if let Some(parent) = dest_path.parent() {
    std::fs::create_dir_all(parent).map_err(|e| {
      let error = build_copy_task_error(
        "create_destination_parent_failed",
        format!("Failed to create task workspace parent: {e}"),
        &task_id,
        &project_id,
        Some(&dest_path),
        0,
        0,
      );
      emit_copy_failure_event(&app, &dest_path, error.clone());
      error
    })?;
  }

  if dest_path.exists() {
    std::fs::remove_dir_all(&dest_path).map_err(|e| {
      let error = build_copy_task_error(
        "cleanup_destination_failed",
        format!("Failed to remove existing task workspace: {e}"),
        &task_id,
        &project_id,
        Some(&dest_path),
        0,
        0,
      );
      emit_copy_failure_event(&app, &dest_path, error.clone());
      error
    })?;
  }

  let task_id_clone = task_id.clone();
  let project_id_clone = project_id.clone();
  let dest_path_clone = dest_path.clone();

  async_runtime::spawn_blocking(move || {
    let total_files = count_files(&source_path).map_err(|e| {
      let error = build_copy_task_error(
        "count_files_failed",
        format!("Failed to count source files: {e}"),
        &task_id,
        &project_id,
        Some(&dest_path),
        0,
        0,
      );
      emit_copy_failure_event(&app, &dest_path, error.clone());
      error
    })?;

    let mut options = CopyOptions::new();
    options.content_only = false;
    options.copy_inside = false;

    let mut copied_files = 0usize;
    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let project_id_clone = project_id.clone();
    let task_path = dest_path.to_string_lossy().to_string();

    let handler = |_process_info: dir::TransitProcess| {
      if total_files > 0 {
        copied_files = (copied_files + 1).min(total_files);
      }

      let progress = if total_files > 0 {
        ((copied_files as f64 / total_files as f64) * 99.0).floor() as u32
      } else {
        0
      };

      emit_copy_progress_event(
        &app_handle,
        CopyProgressEvent {
          task_id: task_id_clone.clone(),
          project_id: project_id_clone.clone(),
          progress,
          copied_files,
          total_files,
          status: CopyProgressStatus::InProgress,
          task_path: task_path.clone(),
          error: None,
        },
      );

      dir::TransitProcessResult::ContinueOrAbort
    };

    if let Err(copy_error) = dir::copy_with_progress(&project_path, &dest_path, &options, handler) {
      let mut message = format!("Failed to copy project into task workspace: {copy_error}");

      if dest_path.exists() {
        if let Err(cleanup_error) = std::fs::remove_dir_all(&dest_path) {
          message.push_str(&format!(
            "; failed to cleanup partial copy: {cleanup_error}"
          ));
        }
      }

      let error = build_copy_task_error(
        "copy_failed",
        message,
        &task_id,
        &project_id,
        Some(&dest_path),
        copied_files,
        total_files,
      );
      emit_copy_failure_event(&app, &dest_path, error.clone());
      return Err(error);
    }

    let copied_files = if total_files > 0 {
      total_files
    } else {
      copied_files
    };
    emit_copy_progress_event(
      &app,
      CopyProgressEvent {
        task_id,
        project_id,
        progress: 100,
        copied_files,
        total_files,
        status: CopyProgressStatus::Completed,
        task_path: dest_path.to_string_lossy().to_string(),
        error: None,
      },
    );

    Ok(dest_path.to_string_lossy().to_string())
  })
  .await
  .map_err(|e| {
    build_copy_task_error(
      "spawn_failed",
      format!("Failed to spawn copy task: {e}"),
      &task_id_clone,
      &project_id_clone,
      Some(&dest_path_clone),
      0,
      0,
    )
  })?
}

/// 計算目錄中的檔案數量（遞歸）
fn count_files(dir: &Path) -> std::io::Result<usize> {
  let mut count = 0usize;

  for entry in std::fs::read_dir(dir)? {
    let entry = entry?;
    let path = entry.path();

    if path.is_dir() {
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
