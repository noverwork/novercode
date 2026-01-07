use alacritty_terminal::event::{Event, EventListener, WindowSize};
use alacritty_terminal::event_loop::{EventLoop, EventLoopSender, Msg};
use alacritty_terminal::grid::{Dimensions, Scroll};
use alacritty_terminal::sync::FairMutex;
use alacritty_terminal::term::test::TermSize;
use alacritty_terminal::term::{Config as TermConfig, Term};
use alacritty_terminal::tty::{self, Options as PtyOptions};
use parking_lot::Mutex;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

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

/// Terminal session state
struct TerminalSession {
    term: Arc<FairMutex<Term<TauriEventListener>>>,
    sender: EventLoopSender,
    running: Arc<std::sync::atomic::AtomicBool>,
    dirty: Arc<std::sync::atomic::AtomicBool>,
}

// Global terminal sessions storage
lazy_static::lazy_static! {
    static ref SESSIONS: Mutex<HashMap<String, TerminalSession>> = Mutex::new(HashMap::new());
    static ref DIRTY_FLAGS: Mutex<HashMap<String, Arc<std::sync::atomic::AtomicBool>>> = Mutex::new(HashMap::new());
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

    // Always hide shell cursor - Claude Code renders its own cursor
    let cursor_visible = false;

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

// ============ Tauri Commands ============

#[tauri::command]
pub async fn terminal_create(
    app_handle: AppHandle,
    id: String,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
) -> Result<(), String> {
    // Check if session already exists - if so, just trigger a re-render
    {
        let sessions = SESSIONS.lock();
        if let Some(session) = sessions.get(&id) {
            // Mark dirty to trigger re-render for reconnecting client
            session.dirty.store(true, std::sync::atomic::Ordering::Relaxed);
            return Ok(());
        }
    }

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

    // PTY options
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    #[cfg(target_os = "windows")]
    let pty_config = PtyOptions {
        shell: Some(tty::Shell::new(
            shell,
            vec!["-l".into(), "-c".into(), "claude".into()],
        )),
        working_directory: cwd.map(PathBuf::from),
        env: std::collections::HashMap::new(),
        drain_on_exit: false,
        escape_args: Vec::new(),
    };
    #[cfg(not(target_os = "windows"))]
    let pty_config = PtyOptions {
        shell: Some(tty::Shell::new(
            shell,
            vec!["-l".into(), "-c".into(), "claude".into()],
        )),
        working_directory: cwd.map(PathBuf::from),
        env: std::collections::HashMap::new(),
        drain_on_exit: false,
    };

    // Create PTY
    let pty = tty::new(&pty_config, window_size, 0)
        .map_err(|e| format!("Failed to create PTY: {e}"))?;

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
pub fn terminal_scroll(id: String, lines: i32) -> Result<(), String> {
    let sessions = SESSIONS.lock();
    let session = sessions
        .get(&id)
        .ok_or_else(|| "Session not found".to_string())?;

    let is_alt_screen = {
        let term = session.term.lock();
        term.mode().contains(alacritty_terminal::term::TermMode::ALT_SCREEN)
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
