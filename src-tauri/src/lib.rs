pub mod store;
pub mod terminal;
pub mod worktree;

use serde::Serialize;

#[derive(Serialize)]
pub struct ChangedFile {
  pub path: String,
  pub status: String, // M, A, D, etc.
}

#[derive(Serialize)]
pub struct FileDiff {
  pub path: String,
  pub original: String,
  pub modified: String,
}

#[tauri::command]
fn get_changed_files(path: String) -> Result<Vec<ChangedFile>, String> {
  let output = std::process::Command::new("git")
    .args(["status", "--porcelain"])
    .current_dir(&path)
    .output()
    .map_err(|e| e.to_string())?;

  if !output.status.success() {
    return Err(String::from_utf8_lossy(&output.stderr).to_string());
  }

  let stdout = String::from_utf8(output.stdout).map_err(|e| e.to_string())?;
  let files: Vec<ChangedFile> = stdout
    .lines()
    .filter(|line| !line.is_empty())
    .map(|line| {
      let status = line.chars().take(2).collect::<String>().trim().to_string();
      let file_path = line[3..].to_string();
      ChangedFile {
        path: file_path,
        status,
      }
    })
    .collect();

  Ok(files)
}

#[tauri::command]
fn get_file_diff(path: String, file_path: String) -> Result<FileDiff, String> {
  // Get original content (HEAD version)
  let original_output = std::process::Command::new("git")
    .args(["show", &format!("HEAD:{file_path}")])
    .current_dir(&path)
    .output()
    .map_err(|e| e.to_string())?;

  let original = if original_output.status.success() {
    String::from_utf8_lossy(&original_output.stdout).to_string()
  } else {
    String::new() // New file, no original
  };

  // Get modified content (working directory)
  let full_path = std::path::Path::new(&path).join(&file_path);
  let modified = std::fs::read_to_string(&full_path).unwrap_or_default();

  Ok(FileDiff {
    path: file_path,
    original,
    modified,
  })
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "windows")]
  {
    std::process::Command::new("explorer")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(&path)
      .spawn()
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Initialize file logging to ~/Library/Logs/com.noverwork.novercode/
  let log_dir = dirs::home_dir().map_or_else(
    || std::path::PathBuf::from("."),
    |h| h.join("Library/Logs/com.noverwork.novercode"),
  );
  std::fs::create_dir_all(&log_dir).ok();

  let _log_file = log_dir.join("novercode.log");
  let file_appender = tracing_appender::rolling::never(log_dir, "novercode.log");
  let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

  tracing_subscriber::fmt()
    .with_writer(non_blocking)
    .with_max_level(tracing::Level::DEBUG)
    .init();

  tracing::info!("Novercode starting...");

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .manage(store::StoreState::default())
    .setup(|app| {
      store::init_store(app.handle())?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_folder,
      get_changed_files,
      get_file_diff,
      store::get_projects,
      store::add_project,
      store::delete_project,
      store::get_tasks,
      store::get_tasks_by_project,
      store::add_task,
      store::delete_task,
      store::delete_task_atomic,
      store::get_settings,
      store::update_settings,
      worktree::create_worktree,
      worktree::remove_worktree,
      worktree::get_task_working_dir,
      worktree::copy_task,
      terminal::terminal_create,
      terminal::terminal_write,
      terminal::terminal_mouse_input,
      terminal::terminal_resize,
      terminal::terminal_kill,
      terminal::terminal_kill_task_sessions,
      terminal::terminal_scroll,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
