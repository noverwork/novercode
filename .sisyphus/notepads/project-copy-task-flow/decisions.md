## 2026-02-11

- Kept `base_branch` field in Rust `Project` model only for backward-compatible deserialization, but disabled serialization to remove it from active frontend data flow.
- Left `addProject` hook signature accepting an ignored third parameter (`_baseBranch`) to avoid widening scope into unrelated callsites while removing payload emission.

## 2026-02-11 (task 2)

- Standardized workspace path resolution around `project_id` + `task_id`; stopped deriving task workspace paths from project name.
- Added explicit managed-root guard before destructive/copy operations so `remove_dir_all` and copy destination writes cannot target outside `app_data/worktrees`.
- Added focused unit tests in `worktree.rs` to lock in path uniqueness and root-bound safety behavior.
