# Terminal Default Shell Startup

## TL;DR

> **Quick Summary**: Change the built-in task terminal startup so new terminals open to a normal shell prompt instead of auto-running Claude Code, while keeping the change surgical and low-risk.
>
> **Deliverables**:
>
> - Backend terminal startup no longer executes `claude` by default
> - Cursor visibility behavior works for normal shell usage (not forced hidden)
> - Automated Rust checks + command-level QA evidence for the changed behavior
>
> **Estimated Effort**: Short
> **Parallel Execution**: NO - sequential
> **Critical Path**: Task 1 -> Task 2 -> Task 3

---

## Context

### Original Request

User wants the app terminal to open as a real shell by default, not jump directly into Claude Code.

### Interview Summary

**Key Discussions**:

- User clarified issue is in-app terminal behavior, not macOS Terminal profile behavior.
- Target behavior selected: default open normal shell prompt.
- Test preference selected: do not add a new frontend testing framework for this work.

**Research Findings**:

- `src/components/kanban/canvas-terminal.tsx:187` calls `terminal_create` without a startup-command override.
- `src-tauri/src/terminal.rs:337` and `src-tauri/src/terminal.rs:348` currently pass `-l -c <claude_cmd>`, which auto-launches Claude.
- `src-tauri/src/terminal.rs:232` currently forces `cursor_visible = false`, optimized for Claude UI rather than plain shell.
- `src-tauri/src/store.rs:22` + `src/components/settings-sheet.tsx:208` expose `claudePath` setting.

### Metis Review

**Identified Gaps** (addressed):

- Hidden Claude coupling in cursor rendering -> include explicit cursor-policy task.
- Scope creep risk (settings redesign / profile system) -> strict must-not guardrails.
- Existing session reuse behavior -> explicitly scope acceptance to newly created sessions.

---

## Work Objectives

### Core Objective

Make new in-app terminal sessions start as a plain shell (prompt-first), with no automatic Claude process launch.

### Concrete Deliverables

- Startup command path in `src-tauri/src/terminal.rs` no longer executes `claude` on `terminal_create`.
- Cursor visibility logic in `src-tauri/src/terminal.rs` is no longer hardcoded false.
- Rust test coverage for startup-args behavior added under existing `cargo test` workflow.

### Definition of Done

- [x] `cargo test --manifest-path src-tauri/Cargo.toml` passes with new startup behavior tests.
- [x] `npm run lint:rust` passes.
- [x] `npm run build` passes.
- [x] Pattern check confirms no shell startup using `-c claude` in terminal creation path.

### Must Have

- Default terminal startup is plain shell prompt for newly created sessions.
- No human-only verification; all acceptance is agent-executable.

### Must NOT Have (Guardrails)

- No new terminal profile system.
- No settings-model redesign in this task.
- No unrelated edits to worktree/task-copy logic or kanban layout behavior.
- No change to existing session reuse semantics beyond startup behavior for new sessions.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> Every acceptance check must be executable by an agent using commands/tools only.

### Test Decision

- **Infrastructure exists**: PARTIAL (Rust tests yes, frontend framework no)
- **Automated tests**: Tests-after (Rust only, no new framework setup)
- **Framework**: `cargo test`

### Agent-Executed QA Scenarios (MANDATORY - ALL tasks)

Scenario: Startup args default to plain shell (no Claude command)
Tool: Bash (`cargo test`)
Preconditions: Rust tests added for startup-arg builder behavior
Steps: 1. Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests::starts_plain_shell_by_default -- --exact` 2. Assert: exit code is 0 3. Assert: output contains `1 passed` 4. Save output: `.sisyphus/evidence/task-1-startup-default-test.txt`
Expected Result: Test proves default startup does not execute Claude
Failure Indicators: test fails OR assertion output missing
Evidence: `.sisyphus/evidence/task-1-startup-default-test.txt`

Scenario: Regression guard - no `-c claude` startup pattern remains
Tool: Bash (`grep`/`rg` equivalent command in executor environment)
Preconditions: code changes applied
Steps: 1. Run pattern search for `"-c"` with `claude_cmd` in `src-tauri/src/terminal.rs` 2. Assert: no match for startup shell arg vector that executes `claude` 3. Save output: `.sisyphus/evidence/task-2-no-claude-autostart-pattern.txt`
Expected Result: startup path no longer shells into Claude automatically
Failure Indicators: any matching startup `-c claude` pattern found
Evidence: `.sisyphus/evidence/task-2-no-claude-autostart-pattern.txt`

Scenario: Full project compile/lint safety after terminal behavior change
Tool: Bash (`npm` + `cargo`)
Preconditions: all tasks completed
Steps: 1. Run: `npm run lint:rust` 2. Run: `npm run build` 3. Assert: both commands exit with code 0 4. Save outputs: `.sisyphus/evidence/task-3-lint-rust.txt`, `.sisyphus/evidence/task-3-build.txt`
Expected Result: no compile/lint regressions
Failure Indicators: non-zero exit code, Rust/TS compile errors
Evidence: `.sisyphus/evidence/task-3-lint-rust.txt`, `.sisyphus/evidence/task-3-build.txt`

Scenario: Negative path - Claude path configured but still no autostart
Tool: Bash (`cargo test`)
Preconditions: test case includes configured `claudePath` context
Steps: 1. Run: `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests::does_not_autostart_claude_even_when_path_exists -- --exact` 2. Assert: exit code is 0 3. Assert: output contains `1 passed` 4. Save output: `.sisyphus/evidence/task-2-no-autostart-with-configured-path.txt`
Expected Result: configured Claude path does not force startup command execution
Failure Indicators: test fails or indicates startup command includes Claude execution
Evidence: `.sisyphus/evidence/task-2-no-autostart-with-configured-path.txt`

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):

- Task 1

Wave 2 (After Wave 1):

- Task 2

Wave 3 (After Wave 2):

- Task 3

Critical Path: Task 1 -> Task 2 -> Task 3
Parallel Speedup: None (same core Rust module touched)

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 2      | None                 |
| 2    | 1          | 3      | None                 |
| 3    | 2          | None   | None                 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents                                                |
| ---- | ----- | ----------------------------------------------------------------- |
| 1    | 1     | `task(category="quick", load_skills=[], run_in_background=false)` |
| 2    | 2     | `task(category="quick", load_skills=[], run_in_background=false)` |
| 3    | 3     | `task(category="quick", load_skills=[], run_in_background=false)` |

---

## TODOs

- [x] 1. Establish deterministic startup-args seam and tests

  **What to do**:
  - Add/refactor a small pure startup-args path in `src-tauri/src/terminal.rs` so default startup behavior is testable without launching PTY.
  - Add Rust tests covering default shell startup args and explicit non-autostart behavior.

  **Must NOT do**:
  - Do not add a new JS/TS test framework.
  - Do not introduce new runtime settings/toggles in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: single-module Rust behavior refactor with clear boundaries.
  - **Skills**: `[]`
    - No available specialized skill directly targets Rust terminal internals for this codebase.
  - **Skills Evaluated but Omitted**:
    - `playwright`: browser automation not needed for this code-level startup behavior.
    - `git-master`: not required for implementation itself (only for git workflows).

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:
  - `src-tauri/src/terminal.rs:248` - Entry point for terminal creation behavior.
  - `src-tauri/src/terminal.rs:337` - Existing startup args currently include command execution.
  - `src-tauri/src/terminal.rs:348` - Non-Windows startup args mirror same autostart pattern.
  - `src-tauri/src/worktree.rs:560` - Existing Rust unit-test style used in this project.

  **Acceptance Criteria**:
  - [x] Rust tests for startup behavior exist under `src-tauri/src/terminal.rs` (or adjacent Rust test module).
  - [x] `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests::starts_plain_shell_by_default -- --exact` passes.
  - [x] `cargo test --manifest-path src-tauri/Cargo.toml terminal::tests::does_not_autostart_claude_even_when_path_exists -- --exact` passes.

  **Agent-Executed QA Scenarios**:
  Scenario: Plain-shell default test passes
  Tool: Bash
  Preconditions: test case implemented
  Steps: 1. Run the exact `cargo test` command for `starts_plain_shell_by_default` 2. Assert status code 0 3. Assert output contains `passed` 4. Save evidence to `.sisyphus/evidence/task-1-plain-shell-test.txt`
  Expected Result: default startup test passes
  Failure Indicators: non-zero exit or missing test
  Evidence: `.sisyphus/evidence/task-1-plain-shell-test.txt`

  Scenario: Negative regression test for configured Claude path
  Tool: Bash
  Preconditions: negative case test implemented
  Steps: 1. Run exact `cargo test` command for `does_not_autostart_claude_even_when_path_exists` 2. Assert status code 0 3. Save output to `.sisyphus/evidence/task-1-configured-path-negative.txt`
  Expected Result: test confirms no forced Claude autostart
  Failure Indicators: failure indicates hidden autostart coupling remains
  Evidence: `.sisyphus/evidence/task-1-configured-path-negative.txt`

  **Commit**: NO (group with Task 2)

- [x] 2. Remove Claude autostart from terminal creation flow

  **What to do**:
  - Update `terminal_create` in `src-tauri/src/terminal.rs` so shell starts plain login/interactive behavior without `-c <claude_cmd>` execution.
  - Keep `cwd` and existing session creation mechanics intact.
  - Keep `claudePath` setting untouched for this task (no UI/settings redesign).

  **Must NOT do**:
  - Do not add new frontend controls/toggles for startup mode.
  - Do not change task/session reconnect model.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: tightly scoped backend behavior change in one module.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no frontend UX redesign in scope.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/components/kanban/canvas-terminal.tsx:187` - Confirms frontend only creates terminal and relies on backend startup behavior.
  - `src-tauri/src/terminal.rs:269` - Current Claude-path resolution block tied to startup behavior.
  - `src-tauri/src/terminal.rs:337` - Windows startup arg assembly currently triggers command execution.
  - `src-tauri/src/terminal.rs:348` - Non-Windows startup arg assembly currently triggers command execution.
  - `src-tauri/src/store.rs:22` - Documents that `claudePath` setting exists and should remain untouched this round.

  **Acceptance Criteria**:
  - [x] Startup arg construction no longer executes `claude` on terminal creation.
  - [x] Search check finds no startup arg vector equivalent to `-l -c <claude_cmd>` in terminal creation path.
  - [x] `cargo test --manifest-path src-tauri/Cargo.toml` passes.

  **Agent-Executed QA Scenarios**:
  Scenario: Code pattern confirms autostart removal
  Tool: Bash
  Preconditions: Task 2 complete
  Steps: 1. Run search in `src-tauri/src/terminal.rs` for startup arg pattern containing `-c` and `claude_cmd` 2. Assert no match in terminal creation path 3. Save output to `.sisyphus/evidence/task-2-pattern-check.txt`
  Expected Result: no Claude autostart pattern remains
  Failure Indicators: pattern still exists
  Evidence: `.sisyphus/evidence/task-2-pattern-check.txt`

  Scenario: Full Rust tests remain green
  Tool: Bash
  Preconditions: code compiles
  Steps: 1. Run `cargo test --manifest-path src-tauri/Cargo.toml` 2. Assert exit code 0 3. Save output to `.sisyphus/evidence/task-2-cargo-test.txt`
  Expected Result: regression-free behavior change
  Failure Indicators: any failed test
  Evidence: `.sisyphus/evidence/task-2-cargo-test.txt`

  **Commit**: YES
  - Message: `fix(terminal): start task terminal with plain shell by default`
  - Files: `src-tauri/src/terminal.rs`
  - Pre-commit: `cargo test --manifest-path src-tauri/Cargo.toml`

- [x] 3. Correct cursor visibility for shell-first terminal UX and run final checks

  **What to do**:
  - Replace hardcoded hidden cursor behavior with cursor visibility derived from terminal state.
  - Run final lint/build checks to validate no backend/frontend regressions.

  **Must NOT do**:
  - Do not alter canvas rendering architecture beyond cursor visibility logic.
  - Do not add animation/theme/UI redesign changes.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: low-complexity polish + verification sweep.
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `ui-ux-pro-max`: not needed; this is behavior correctness, not design overhaul.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: Task 2

  **References**:
  - `src-tauri/src/terminal.rs:232` - Current forced hidden cursor line that must be removed/replaced.
  - `src/components/kanban/canvas-terminal.tsx:172` - Terminal render event flow that consumes cursor state.
  - `package.json:16` - Rust lint command to use for final quality check.
  - `package.json:8` - Build command used for project-wide verification.

  **Acceptance Criteria**:
  - [x] `cursor_visible` is no longer hardcoded to false.
  - [x] `npm run lint:rust` passes.
  - [x] `npm run build` passes.
  - [x] Evidence outputs saved under `.sisyphus/evidence/`.

  **Agent-Executed QA Scenarios**:
  Scenario: Cursor hardcode removal check
  Tool: Bash
  Preconditions: Task 3 code change done
  Steps: 1. Search `src-tauri/src/terminal.rs` for `cursor_visible = false` 2. Assert no match 3. Save output to `.sisyphus/evidence/task-3-cursor-hardcode-check.txt`
  Expected Result: hardcoded hidden cursor removed
  Failure Indicators: exact hardcode still present
  Evidence: `.sisyphus/evidence/task-3-cursor-hardcode-check.txt`

  Scenario: Final lint/build gate
  Tool: Bash
  Preconditions: all edits complete
  Steps: 1. Run `npm run lint:rust` and capture output 2. Run `npm run build` and capture output 3. Assert both exit codes are 0
  Expected Result: change is compile- and lint-safe
  Failure Indicators: any command fails
  Evidence: `.sisyphus/evidence/task-3-lint-rust.txt`, `.sisyphus/evidence/task-3-build.txt`

  **Commit**: YES
  - Message: `fix(terminal): restore shell cursor visibility for default terminal mode`
  - Files: `src-tauri/src/terminal.rs`
  - Pre-commit: `npm run lint:rust && npm run build`

---

## Commit Strategy

| After Task | Message                                                                    | Files                       | Verification                                      |
| ---------- | -------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------- |
| 2          | `fix(terminal): start task terminal with plain shell by default`           | `src-tauri/src/terminal.rs` | `cargo test --manifest-path src-tauri/Cargo.toml` |
| 3          | `fix(terminal): restore shell cursor visibility for default terminal mode` | `src-tauri/src/terminal.rs` | `npm run lint:rust && npm run build`              |

---

## Success Criteria

### Verification Commands

```bash
cargo test --manifest-path src-tauri/Cargo.toml
# Expected: all tests pass, including terminal startup behavior tests

npm run lint:rust
# Expected: clippy completes with exit code 0

npm run build
# Expected: TypeScript + Vite build completes successfully
```

### Final Checklist

- [x] Default terminal startup is shell-first (no automatic Claude execution)
- [x] Cursor behavior is no longer locked hidden for shell mode
- [x] No scope creep into settings/profile redesign
- [x] All automated checks and evidence capture complete
