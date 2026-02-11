# Task 1 Learnings

## Successfully Established Deterministic Startup-Args Seam

### Implementation Summary

- **Created pure function**: `build_startup_args(shell: &str) -> Vec<String>` that returns `vec!["-l".into()]`
- **Extracted startup logic**: Separated from PTY creation, enabling testable default behavior
- **Preserved existing code**: Modified Windows and non-Windows PTY config sections to use pure function
- **Added comprehensive tests**: Verified both default behavior and non-autostart behavior

### Key Technical Decisions

1. **Made function public**: Required for test module access
2. **Cloned shell parameter**: Fixed borrow checker issues in PTY config
3. **Removed `escape_args` field**: Not present in current PtyOptions struct
4. **Placed function before terminal_create**: Module-level accessibility

### Test Structure (Following worktree.rs Pattern)

```rust
#[cfg(test)]
mod tests {
  use super::build_startup_args;

  #[test]
  fn starts_plain_shell_by_default() {
    // Verifies no command execution in default args
  }

  #[test]
  fn does_not_autostart_claude_even_when_path_exists() {
    // Verifies no autostart regardless of claude availability
  }
}
```

### Verification Results

- ✅ `starts_plain_shell_by_default` test passes
- ✅ `does_not_autostart_claude_even_when_path_exists` test passes
- ✅ All existing tests continue to pass
- ✅ Evidence files created with test outputs

### Next Steps for Task 2

- Task 1 established the pure function needed for Task 2
- The startup args seam is now testable without launching PTY
- Task 2 can now safely modify PTY options to use different startup logic

## Task 3 Learnings

- `RenderableCursor` in current `alacritty_terminal` does not expose a `visible` field; visibility should be derived from terminal mode flags.
- Cursor visibility is now driven by `term.mode().contains(alacritty_terminal::term::TermMode::SHOW_CURSOR)` in `extract_grid`, removing hardcoded hidden-cursor behavior.
- Verification artifacts for this task are saved under `.sisyphus/evidence/`:
  - `task-3-cursor-hardcode-check.txt`
  - `task-3-lint-rust.txt`
  - `task-3-build.txt`
  - `task-3-cargo-check.txt`

## Task Switching Learnings

- Keep terminal sessions in a per-task map keyed by task ID so switching tasks restores each task's prior terminal tabs and active tab.
- Avoid terminal session teardown on component unmount when task switching is part of normal navigation.
- Keep the terminal panel mounted during worktree loading so in-memory task terminal state is not dropped between selections.
