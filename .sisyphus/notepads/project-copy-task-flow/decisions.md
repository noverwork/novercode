## 2026-02-11

- Kept `base_branch` field in Rust `Project` model only for backward-compatible deserialization, but disabled serialization to remove it from active frontend data flow.
- Left `addProject` hook signature accepting an ignored third parameter (`_baseBranch`) to avoid widening scope into unrelated callsites while removing payload emission.

## 2026-02-11 (task 2)

- Standardized workspace path resolution around `project_id` + `task_id`; stopped deriving task workspace paths from project name.
- Added explicit managed-root guard before destructive/copy operations so `remove_dir_all` and copy destination writes cannot target outside `app_data/worktrees`.
- Added focused unit tests in `worktree.rs` to lock in path uniqueness and root-bound safety behavior.

## 2026-02-11 (task 3)

- Chose a structured Rust error type (`CopyTaskError`) for `copy_task` so failure responses include machine-readable code/context instead of opaque strings.
- Kept a single `copy-progress` event stream with explicit `status` (`in_progress`/`completed`/`failed`) to make frontend transition handling deterministic.
- On copy failure, command now attempts destination cleanup and returns failure even if cleanup also fails, preventing partial silent success.

## 2026-02-11: Terminology Update to "Task Copy"

- Updated user-facing strings in README.md and board.tsx to use "Task Copy" or "Copying project" instead of "Worktree" or "Creating worktree".
- Kept internal module names (worktree.rs) and function names (create_worktree) to maintain developer consistency and avoid breaking internal logic, while ensuring user-visible error messages match the new model.

## 2026-02-11 (task 6 atomic delete)

- Added `store::delete_task_atomic` as the canonical task deletion entrypoint so cleanup ordering is enforced in one backend flow.
- Reused workspace cleanup logic through a shared `worktree::remove_task_copy` helper; `remove_worktree` now delegates to it instead of duplicating deletion behavior.
- Adopted a compensation policy for store-save failure after cleanup: restore removed task metadata and return an explicit error describing whether rollback succeeded.

## 2026-02-11 (task 4)

- Switched board selection flow from `create_worktree` to `get_task_working_dir` so opening an existing task is read-only with respect to workspace provisioning.
- Kept `get_task_working_dir` deterministic (`worktrees/{project_id}/{task_id}`) with explicit fallback to `project_path` for older tasks that predate copied workspaces.

- Updated backend error message in src-tauri/src/worktree.rs from "Failed to create worktrees dir:" to "Failed to create task workspace directory:" to align with the new mental model of "Task Copy" or "Task Workspace" instead of Git "worktree".
- Verified that src/components/kanban/board.tsx already uses "task workspace" in its console.error message (line 157).

## 2026-02-11 (task 3 follow-up)

- Added explicit `spawn_failed` failure-event emission for `copy_task` so frontend always receives a terminal `copy-progress` event with `status: failed`, even when the blocking copy worker cannot complete.
- On `spawn_failed`, backend now attempts destination cleanup before returning `Err(CopyTaskError)`, preventing silent partial workspace leftovers from thread-panic/join-failure paths.
