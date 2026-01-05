pub mod claude;
pub mod store;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_pty::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(store::StoreState::default())
        .setup(|app| {
            store::init_store(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            claude::check_claude_installed,
            claude::check_claude_auth,
            claude::send_claude_message,
            claude::stream_claude_message,
            store::get_projects,
            store::add_project,
            store::delete_project,
            store::get_tasks,
            store::get_tasks_by_project,
            store::add_task,
            store::delete_task,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
