use alacritty_terminal::event::{Event, EventListener, OnResize, WindowSize};
use alacritty_terminal::event_loop::{EventLoop, EventLoopSender, Msg};
use alacritty_terminal::grid::{Dimensions, Scroll};
use alacritty_terminal::sync::FairMutex;
use alacritty_terminal::term::test::TermSize;
use alacritty_terminal::term::{Config as TermConfig, Term};
use alacritty_terminal::tty::{self, Options as PtyOptions};
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::io::{self, Read};
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::{Mutex as StdMutex, MutexGuard as StdMutexGuard, PoisonError};
use tauri::{AppHandle, Emitter, State};
use tracing::{error, info, warn};

use crate::store::StoreState;

// 處理 std::sync::Mutex poison
fn lock_or_recover_std<T>(mutex: &StdMutex<T>) -> StdMutexGuard<'_, T> {
  mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

/// A cell in the terminal grid
#[derive(Clone, Serialize)]
pub struct TermCell {
  pub c: String,
  pub fg: [u8; 3],
  pub bg: [u8; 3],
  pub bold: bool,
  pub italic: bool,
  pub underline: bool,
  pub wide: bool,
  pub spacer: bool, // WIDE_CHAR_SPACER - skip rendering
}

/// Terminal grid state for frontend rendering
#[derive(Clone, Serialize)]
pub struct TerminalGrid {
  pub id: String,
  pub cols: usize,
  pub rows: usize,
  pub cells: Vec<Vec<TermCell>>,
  pub cursor_x: usize,
  pub cursor_y: usize,
  pub cursor_visible: bool,
}

#[derive(Clone, Serialize)]
struct TerminalOutputPayload {
  data: String,
}

/// Event listener that forwards events to Tauri
struct TauriEventListener {
  id: String,
  app_handle: AppHandle,
}

impl EventListener for TauriEventListener {
  fn send_event(&self, event: Event) {
    match event {
      Event::Wakeup => {
        // Terminal content changed - set dirty flag
        if let Some(dirty) = DIRTY_FLAGS.lock().get(&self.id) {
          dirty.store(true, std::sync::atomic::Ordering::Relaxed);
        }
      }
      Event::Exit => {
        let _ = self
          .app_handle
          .emit(&format!("terminal-exit-{}", self.id), ());
      }
      _ => {}
    }
  }
}

struct RawOutputForwardingReader<T: tty::EventedPty> {
  pty: *mut T,
  event_name: String,
  app_handle: AppHandle,
}

unsafe impl<T: tty::EventedPty + Send> Send for RawOutputForwardingReader<T> {}

impl<T: tty::EventedPty> Read for RawOutputForwardingReader<T> {
  fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
    let read = unsafe { (&mut *self.pty).reader().read(buf) }?;

    if read > 0 {
      let payload = TerminalOutputPayload {
        data: BASE64_STANDARD.encode(&buf[..read]),
      };
      let _ = self.app_handle.emit(&self.event_name, payload);
    }

    Ok(read)
  }
}

struct RawOutputForwardingPty<T: tty::EventedPty> {
  pty: Box<T>,
  reader: RawOutputForwardingReader<T>,
}

impl<T: tty::EventedPty> RawOutputForwardingPty<T> {
  fn new(pty: T, id: String, app_handle: AppHandle) -> Self {
    let mut pty = Box::new(pty);
    let reader = RawOutputForwardingReader {
      pty: pty.as_mut() as *mut T,
      event_name: format!("terminal-output-{id}"),
      app_handle,
    };

    Self { pty, reader }
  }
}

unsafe impl<T: tty::EventedPty + Send> Send for RawOutputForwardingPty<T> {}

impl<T: tty::EventedPty> tty::EventedReadWrite for RawOutputForwardingPty<T> {
  type Reader = RawOutputForwardingReader<T>;
  type Writer = T::Writer;

  unsafe fn register(
    &mut self,
    poll: &Arc<polling::Poller>,
    interest: polling::Event,
    poll_opts: polling::PollMode,
  ) -> io::Result<()> {
    unsafe { self.pty.register(poll, interest, poll_opts) }
  }

  fn reregister(
    &mut self,
    poll: &Arc<polling::Poller>,
    interest: polling::Event,
    poll_opts: polling::PollMode,
  ) -> io::Result<()> {
    self.pty.reregister(poll, interest, poll_opts)
  }

  fn deregister(&mut self, poll: &Arc<polling::Poller>) -> io::Result<()> {
    self.pty.deregister(poll)
  }

  fn reader(&mut self) -> &mut Self::Reader {
    &mut self.reader
  }

  fn writer(&mut self) -> &mut Self::Writer {
    self.pty.writer()
  }
}

impl<T: tty::EventedPty> tty::EventedPty for RawOutputForwardingPty<T> {
  fn next_child_event(&mut self) -> Option<tty::ChildEvent> {
    self.pty.next_child_event()
  }
}

impl<T> OnResize for RawOutputForwardingPty<T>
where
  T: tty::EventedPty + OnResize,
{
  fn on_resize(&mut self, window_size: WindowSize) {
    self.pty.on_resize(window_size);
  }
}

/// Terminal session state
struct TerminalSession {
  term: Arc<FairMutex<Term<TauriEventListener>>>,
  sender: EventLoopSender,
  running: Arc<std::sync::atomic::AtomicBool>,
  dirty: Arc<std::sync::atomic::AtomicBool>,
  cwd: Option<String>,
}

// Global terminal sessions storage
lazy_static::lazy_static! {
    static ref SESSIONS: Mutex<HashMap<String, TerminalSession>> = Mutex::new(HashMap::new());
    static ref DIRTY_FLAGS: Mutex<HashMap<String, Arc<std::sync::atomic::AtomicBool>>> = Mutex::new(HashMap::new());
}

const TASK_TERMINAL_ID_SEPARATOR: &str = ":terminal:";

fn is_session_bound_to_task(session_id: &str, task_id: &str) -> bool {
  if session_id == task_id {
    return true;
  }

  session_id.starts_with(&format!("{task_id}{TASK_TERMINAL_ID_SEPARATOR}"))
}

/// Convert alacritty color to RGB array
fn color_to_rgb(color: alacritty_terminal::vte::ansi::Color, default: [u8; 3]) -> [u8; 3] {
  match color {
    alacritty_terminal::vte::ansi::Color::Named(named) => {
      use alacritty_terminal::vte::ansi::NamedColor;
      match named {
        NamedColor::Black => [0, 0, 0],
        NamedColor::Red => [239, 68, 68],
        NamedColor::Green => [34, 197, 94],
        NamedColor::Yellow => [234, 179, 8],
        NamedColor::Blue => [59, 130, 246],
        NamedColor::Magenta => [168, 85, 247],
        NamedColor::Cyan => [6, 182, 212],
        NamedColor::White => [245, 245, 245],
        NamedColor::BrightBlack => [82, 82, 82],
        NamedColor::BrightRed => [248, 113, 113],
        NamedColor::BrightGreen => [74, 222, 128],
        NamedColor::BrightYellow => [250, 204, 21],
        NamedColor::BrightBlue => [96, 165, 250],
        NamedColor::BrightMagenta => [192, 132, 252],
        NamedColor::BrightCyan => [34, 211, 238],
        NamedColor::BrightWhite => [255, 255, 255],
        NamedColor::Foreground => [34, 197, 94],
        NamedColor::Background => [10, 10, 10],
        _ => default,
      }
    }
    alacritty_terminal::vte::ansi::Color::Spec(rgb) => [rgb.r, rgb.g, rgb.b],
    alacritty_terminal::vte::ansi::Color::Indexed(idx) => {
      if idx < 16 {
        let colors: [[u8; 3]; 16] = [
          [0, 0, 0],
          [239, 68, 68],
          [34, 197, 94],
          [234, 179, 8],
          [59, 130, 246],
          [168, 85, 247],
          [6, 182, 212],
          [245, 245, 245],
          [82, 82, 82],
          [248, 113, 113],
          [74, 222, 128],
          [250, 204, 21],
          [96, 165, 250],
          [192, 132, 252],
          [34, 211, 238],
          [255, 255, 255],
        ];
        colors[idx as usize]
      } else if idx < 232 {
        let idx = idx - 16;
        let r = (idx / 36) * 51;
        let g = ((idx / 6) % 6) * 51;
        let b = (idx % 6) * 51;
        [r, g, b]
      } else {
        let gray = (idx - 232) * 10 + 8;
        [gray, gray, gray]
      }
    }
  }
}

/// Extract grid state from terminal for rendering
fn extract_grid(term: &Term<TauriEventListener>, id: &str) -> TerminalGrid {
  let content = term.renderable_content();
  let cols = term.columns();
  let rows = term.screen_lines();

  // Default colors
  let default_fg = [34, 197, 94]; // green
  let default_bg = [10, 10, 10]; // dark

  // Pre-fill with empty cells
  let mut cells: Vec<Vec<TermCell>> = (0..rows)
    .map(|_| {
      (0..cols)
        .map(|_| TermCell {
          c: " ".to_string(),
          fg: default_fg,
          bg: default_bg,
          bold: false,
          italic: false,
          underline: false,
          wide: false,
          spacer: false,
        })
        .collect()
    })
    .collect();

  // Fill in actual content
  // Note: display_iter yields cells in screen coordinates (line 0 = top of viewport)
  for cell in content.display_iter {
    let point = cell.point;
    let line_raw = point.line.0;
    // Skip if line is negative (shouldn't happen for visible content)
    if line_raw < 0 || line_raw >= rows as i32 {
      continue;
    }
    let row = line_raw as usize;
    let col = point.column.0;

    if col < cols {
      let c = cell.cell.c.to_string();
      let flags = cell.cell.flags;
      let is_inverse = flags.contains(alacritty_terminal::term::cell::Flags::INVERSE);

      // Handle INVERSE flag - swap fg/bg colors (used by TUI apps for cursor)
      let (fg, bg) = if is_inverse {
        (
          color_to_rgb(cell.cell.bg, default_bg),
          color_to_rgb(cell.cell.fg, default_fg),
        )
      } else {
        (
          color_to_rgb(cell.cell.fg, default_fg),
          color_to_rgb(cell.cell.bg, default_bg),
        )
      };

      cells[row][col] = TermCell {
        c,
        fg,
        bg,
        bold: flags.contains(alacritty_terminal::term::cell::Flags::BOLD),
        italic: flags.contains(alacritty_terminal::term::cell::Flags::ITALIC),
        underline: flags.contains(alacritty_terminal::term::cell::Flags::UNDERLINE),
        wide: flags.contains(alacritty_terminal::term::cell::Flags::WIDE_CHAR),
        spacer: flags.contains(alacritty_terminal::term::cell::Flags::WIDE_CHAR_SPACER),
      };
    }
  }

  // Cursor position (already in screen coordinates from renderable_content)
  let cursor = content.cursor;
  let cursor_x = cursor.point.column.0;
  let cursor_line = cursor.point.line.0;
  let cursor_y = if cursor_line >= 0 && cursor_line < rows as i32 {
    cursor_line as usize
  } else {
    rows.saturating_sub(1) // Default to bottom if out of range
  };

  let cursor_visible = term
    .mode()
    .contains(alacritty_terminal::term::TermMode::SHOW_CURSOR);

  TerminalGrid {
    id: id.to_string(),
    cols,
    rows,
    cells,
    cursor_x,
    cursor_y,
    cursor_visible,
  }
}

// ============ Helper Functions ============

pub fn build_startup_args(cwd: &Option<String>) -> Vec<String> {
  let mut args = vec!["-l".into()];

  if let Some(ref dir) = cwd {
    args.push("-c".into());
    args.push(format!("cd \"{dir}\" && exec \"$SHELL\""));
  }

  args
}

fn encode_mouse_sgr(
  event: &str,
  button: u8,
  col: u16,
  row: u16,
  modifiers: u8,
) -> Result<Vec<u8>, String> {
  if col == 0 || row == 0 {
    return Err("Mouse coordinates must be 1-based".to_string());
  }

  if event == "wheel" && button != 64 && button != 65 {
    return Err(format!("Unsupported wheel button code: {button}"));
  }

  let mut code = u16::from(button) + u16::from(modifiers);

  if event == "drag" {
    code += 32;
  }

  if code > u8::MAX as u16 {
    return Err(format!("Mouse button code overflow: {code}"));
  }

  let suffix = match event {
    "press" | "drag" | "wheel" => 'M',
    "release" => 'm',
    _ => return Err(format!("Unsupported mouse event: {event}")),
  };

  Ok(format!("\u{1b}[<{};{};{}{}", code, col, row, suffix).into_bytes())
}

// ============ Tauri Commands ============

/// Creates or reuses a terminal session for `id`.
///
/// # Idempotence
/// - If a session with the same `id` already exists and `cwd` matches,
///   this returns early and keeps the existing PTY/event loop alive.
/// - If a session with the same `id` exists but `cwd` differs,
///   the old session is killed and a new one is created.
///
/// The existence check runs under the global `SESSIONS` mutex, so concurrent
/// calls for the same `id` are serialized at this decision point.
#[tauri::command]
pub async fn terminal_create(
  app_handle: AppHandle,
  state: State<'_, StoreState>,
  id: String,
  cols: u16,
  rows: u16,
  cwd: Option<String>,
) -> Result<(), String> {
  let recreate_existing = {
    let sessions = SESSIONS.lock();
    if let Some(session) = sessions.get(&id) {
      if session.cwd == cwd {
        session
          .dirty
          .store(true, std::sync::atomic::Ordering::Relaxed);
        return Ok(());
      }
      true
    } else {
      false
    }
  };

  if recreate_existing {
    terminal_kill(id.clone())?;
  }

  // === Get claude path from settings ===
  let settings = lock_or_recover_std(&state.settings);
  let settings_claude_path = settings.claude_path.clone();
  drop(settings);

  // Resolve claude path:
  // 1. Use settings if configured
  // 2. Try `which claude`
  // 3. Fall back to "claude" (may fail in production)
  let claude_path = settings_claude_path.and_then(|path| {
    if std::path::Path::new(&path).exists() {
      info!(id = %id, claude_path = %path, "Using claude from settings");
      Some(path)
    } else {
      warn!(id = %id, path = %path, "Claude path in settings doesn't exist, falling back");
      None
    }
  });

  let claude_path = claude_path.or_else(|| {
    // Try which claude
    let which_result = std::process::Command::new("which").arg("claude").output();
    match which_result {
      Ok(output) if output.status.success() => {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        info!(id = %id, claude_path = %path, "Found claude via which");
        Some(path)
      }
      Ok(_) => {
        warn!(id = %id, "which claude failed - command not found");
        None
      }
      Err(e) => {
        error!(id = %id, error = %e, "which command failed");
        None
      }
    }
  });

  let claude_cmd = claude_path.as_deref().unwrap_or("claude");
  // ====================================

  let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
  info!(id = %id, shell = %shell, claude_cmd = %claude_cmd, "Creating terminal");

  let window_size = WindowSize {
    num_cols: cols,
    num_lines: rows,
    cell_width: 1,
    cell_height: 1,
  };

  let term_size = TermSize::new(cols as usize, rows as usize);

  let event_listener = TauriEventListener {
    id: id.clone(),
    app_handle: app_handle.clone(),
  };

  let term_config = TermConfig::default();
  let term = Term::new(term_config, &term_size, event_listener);
  let term = Arc::new(FairMutex::new(term));
  let startup_args = build_startup_args(&cwd);

  // PTY options - use pure startup args
  #[cfg(target_os = "windows")]
  let pty_config = PtyOptions {
    shell: Some(tty::Shell::new(shell.clone(), startup_args.clone())),
    working_directory: cwd.clone().map(PathBuf::from),
    env: std::collections::HashMap::new(),
    drain_on_exit: false,
  };
  #[cfg(not(target_os = "windows"))]
  let pty_config = PtyOptions {
    shell: Some(tty::Shell::new(shell.clone(), startup_args)),
    working_directory: cwd.clone().map(PathBuf::from),
    env: std::collections::HashMap::new(),
    drain_on_exit: false,
  };

  // Create PTY
  let pty = tty::new(&pty_config, window_size, 0).map_err(|e| {
    error!(id = %id, error = %e, "PTY creation failed");
    format!("PTY creation failed: {e}")
  })?;
  let pty = RawOutputForwardingPty::new(pty, id.clone(), app_handle.clone());

  // Event listener for event loop
  let event_listener = TauriEventListener {
    id: id.clone(),
    app_handle: app_handle.clone(),
  };

  // Create event loop
  let event_loop = EventLoop::new(term.clone(), event_listener, pty, false, false)
    .map_err(|e| format!("Failed to create event loop: {e}"))?;

  let sender = event_loop.channel();
  let running = Arc::new(std::sync::atomic::AtomicBool::new(true));
  let dirty = Arc::new(std::sync::atomic::AtomicBool::new(true)); // Start dirty to trigger initial render

  // Store dirty flag for event listener access
  {
    let mut dirty_flags = DIRTY_FLAGS.lock();
    dirty_flags.insert(id.clone(), dirty.clone());
  }

  // Store session
  {
    let mut sessions = SESSIONS.lock();
    sessions.insert(
      id.clone(),
      TerminalSession {
        term: term.clone(),
        sender,
        running: running.clone(),
        dirty: dirty.clone(),
        cwd: cwd.clone(),
      },
    );
  }

  // Spawn event loop thread
  std::thread::spawn(move || {
    event_loop.spawn();
  });

  // Spawn render loop
  std::thread::spawn(move || {
    while running.load(std::sync::atomic::Ordering::Relaxed) {
      std::thread::sleep(std::time::Duration::from_millis(16)); // ~60fps

      // Only render if dirty
      if !dirty.swap(false, std::sync::atomic::Ordering::Relaxed) {
        continue;
      }

      let grid = {
        let t = term.lock();
        extract_grid(&t, &id)
      };

      if app_handle
        .emit(&format!("terminal-render-{id}"), &grid)
        .is_err()
      {
        break;
      }
    }
  });

  Ok(())
}

#[tauri::command]
pub fn terminal_write(id: String, data: Vec<u8>) -> Result<(), String> {
  let sessions = SESSIONS.lock();
  let session = sessions
    .get(&id)
    .ok_or_else(|| "Session not found".to_string())?;

  session
    .sender
    .send(Msg::Input(data.into()))
    .map_err(|e| format!("Failed to send input: {e:?}"))?;

  Ok(())
}

#[tauri::command]
pub fn terminal_mouse_input(
  id: String,
  event: String,
  button: u8,
  col: u16,
  row: u16,
  modifiers: u8,
) -> Result<(), String> {
  let sessions = SESSIONS.lock();
  let session = sessions
    .get(&id)
    .ok_or_else(|| "Session not found".to_string())?;

  let data = encode_mouse_sgr(&event, button, col, row, modifiers)?;

  session
    .sender
    .send(Msg::Input(data.into()))
    .map_err(|e| format!("Failed to send mouse input: {e:?}"))?;

  Ok(())
}

#[tauri::command]
pub fn terminal_resize(id: String, cols: u16, rows: u16) -> Result<(), String> {
  let sessions = SESSIONS.lock();
  let session = sessions
    .get(&id)
    .ok_or_else(|| "Session not found".to_string())?;

  let size = WindowSize {
    num_cols: cols,
    num_lines: rows,
    cell_width: 1,
    cell_height: 1,
  };

  session
    .sender
    .send(Msg::Resize(size))
    .map_err(|e| format!("Failed to resize: {e:?}"))?;

  // Also resize the term
  {
    let mut term = session.term.lock();
    term.resize(TermSize::new(cols as usize, rows as usize));
  }

  Ok(())
}

#[tauri::command]
pub fn terminal_kill(id: String) -> Result<(), String> {
  // Remove dirty flag
  {
    let mut dirty_flags = DIRTY_FLAGS.lock();
    dirty_flags.remove(&id);
  }

  // Remove session
  let mut sessions = SESSIONS.lock();
  if let Some(session) = sessions.remove(&id) {
    session
      .running
      .store(false, std::sync::atomic::Ordering::Relaxed);
    let _ = session.sender.send(Msg::Shutdown);
  }

  Ok(())
}

#[tauri::command]
pub fn terminal_kill_task_sessions(task_id: String) -> Result<usize, String> {
  let session_ids: Vec<String> = {
    let sessions = SESSIONS.lock();
    sessions
      .keys()
      .filter(|session_id| is_session_bound_to_task(session_id.as_str(), &task_id))
      .cloned()
      .collect()
  };

  let mut killed_count = 0;
  for session_id in session_ids {
    terminal_kill(session_id)?;
    killed_count += 1;
  }

  Ok(killed_count)
}

#[cfg(test)]
mod tests {
  use super::{build_startup_args, encode_mouse_sgr, is_session_bound_to_task};

  #[test]
  fn starts_plain_shell_by_default() {
    let args = build_startup_args(&None);

    assert_eq!(args, vec!["-l".to_string()]);
    assert!(!args.contains(&"-c".to_string()));
    assert!(!args.contains(&"claude".to_string()));
  }

  #[test]
  fn does_not_autostart_claude_even_when_path_exists() {
    let args = build_startup_args(&None);

    assert_eq!(args, vec!["-l".to_string()]);
    assert!(!args.contains(&"-c".to_string()));
    assert!(!args.contains(&"claude".to_string()));

    let cwd_args = build_startup_args(&Some("/tmp/worktree".to_string()));
    assert!(cwd_args.contains(&"-c".to_string()));
  }

  #[test]
  fn mouse_protocol_left_press_at_col1_row1() {
    let bytes = encode_mouse_sgr("press", 0, 1, 1, 0).expect("left press should encode");
    assert_eq!(bytes, b"\x1b[<0;1;1M");
  }

  #[test]
  fn mouse_protocol_left_release_at_col10_row5() {
    let bytes = encode_mouse_sgr("release", 0, 10, 5, 0).expect("left release should encode");
    assert_eq!(bytes, b"\x1b[<0;10;5m");
  }

  #[test]
  fn mouse_protocol_drag_with_left_button() {
    let bytes = encode_mouse_sgr("drag", 0, 7, 3, 0).expect("drag should encode");
    assert_eq!(bytes, b"\x1b[<32;7;3M");
  }

  #[test]
  fn mouse_protocol_wheel_up_and_down() {
    let wheel_up = encode_mouse_sgr("wheel", 64, 4, 9, 0).expect("wheel up should encode");
    let wheel_down = encode_mouse_sgr("wheel", 65, 4, 9, 0).expect("wheel down should encode");

    assert_eq!(wheel_up, b"\x1b[<64;4;9M");
    assert_eq!(wheel_down, b"\x1b[<65;4;9M");
  }

  #[test]
  fn task_session_match_primary_id() {
    assert!(is_session_bound_to_task("task-123", "task-123"));
  }

  #[test]
  fn task_session_match_secondary_id() {
    assert!(is_session_bound_to_task("task-123:terminal:2", "task-123"));
  }

  #[test]
  fn task_session_does_not_match_other_task() {
    assert!(!is_session_bound_to_task(
      "task-1234:terminal:2",
      "task-123"
    ));
  }
}
#[tauri::command]
pub fn terminal_scroll(id: String, lines: i32) -> Result<(), String> {
  let sessions = SESSIONS.lock();
  let session = sessions
    .get(&id)
    .ok_or_else(|| "Session not found".to_string())?;

  let is_alt_screen = {
    let term = session.term.lock();
    term
      .mode()
      .contains(alacritty_terminal::term::TermMode::ALT_SCREEN)
  };

  if is_alt_screen {
    // In alternate screen (TUI mode), send arrow keys to the program
    // lines > 0 means scroll up (show older content) -> send Up arrow
    // lines < 0 means scroll down (show newer content) -> send Down arrow
    let arrow = if lines > 0 {
      vec![27, 91, 65] // ESC [ A (Up)
    } else {
      vec![27, 91, 66] // ESC [ B (Down)
    };

    let count = lines.unsigned_abs() as usize;
    for _ in 0..count {
      session
        .sender
        .send(Msg::Input(arrow.clone().into()))
        .map_err(|e| format!("Failed to send input: {e:?}"))?;
    }
  } else {
    // Normal mode, use scrollback
    let mut term = session.term.lock();
    term.scroll_display(Scroll::Delta(lines));

    // Mark dirty to trigger re-render
    session
      .dirty
      .store(true, std::sync::atomic::Ordering::Relaxed);
  }

  Ok(())
}
