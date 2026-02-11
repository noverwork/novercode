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
