## 2026-02-11

- Removed `baseBranch` UI input and submit argument from onboarding dialog to keep add-project flow path-only.
- Kept frontend project shape compatible by leaving optional `baseBranch` in TypeScript model while no longer sending it during `add_project` invoke.
- Preserved persisted data compatibility in Rust by keeping `base_branch` as deserialize-only (`alias = "base_branch"`, `skip_serializing`) so old records load without re-emitting the field.

## 2026-02-11 (task 2)

- Canonical task workspace path is now deterministic and collision-safe by resolving to `worktrees/{project_id}/{task_id}`.
- Path segments must pass validation (no empty values, no separators, no `.`/`..`) before any workspace path is resolved.
- Filesystem safety check is stronger when expressed as `ensure_path_within_root(root, target)` so delete/copy operations can be rejected uniformly.
