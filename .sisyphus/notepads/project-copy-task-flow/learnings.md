## 2026-02-11

- Removed `baseBranch` UI input and submit argument from onboarding dialog to keep add-project flow path-only.
- Kept frontend project shape compatible by leaving optional `baseBranch` in TypeScript model while no longer sending it during `add_project` invoke.
- Preserved persisted data compatibility in Rust by keeping `base_branch` as deserialize-only (`alias = "base_branch"`, `skip_serializing`) so old records load without re-emitting the field.

## 2026-02-11 (task 2)

- Canonical task workspace path is now deterministic and collision-safe by resolving to `worktrees/{project_id}/{task_id}`.
- Path segments must pass validation (no empty values, no separators, no `.`/`..`) before any workspace path is resolved.
- Filesystem safety check is stronger when expressed as `ensure_path_within_root(root, target)` so delete/copy operations can be rejected uniformly.

## 2026-02-11 (task 3)

- Copy command is task-scoped (`copy_task`) and targets `worktrees/{project_id}/{task_id}` so project-level destination collisions are removed.
- `copy-progress` payload now carries both `task_id` and `project_id` with `copied_files` and `total_files` so frontend can correlate concurrent copies safely.
- Progress updates are capped below 100 during transfer, then a final explicit completion event emits `progress: 100` to avoid premature ready-state transitions.

## 2026-02-11: User-Facing Model Alignment

- Aligning terminology with the user's mental model ("Task Copy") reduces confusion, especially when the underlying implementation might use specific technical tools (like git worktrees) that the user doesn't need to know about.
- When changing terminology, it's important to scan not just the primary UI files but also documentation (README) and backend error messages to ensure a consistent experience.
