# Replace Worktree Flow with Full Project Copy + Progress

## TL;DR

> **Quick Summary**: Replace task isolation from `git worktree` to full directory copy. Project onboarding keeps only base project path (no base branch), and task creation performs full copy with real-time progress.
>
> **Deliverables**:
>
> - Remove base-branch input and active usage from onboarding/data flow.
> - Add task-scoped project copy lifecycle (create, progress, resolve working dir, delete cleanup).
> - Add progress modal UX during task creation copy.
> - Keep backward compatibility for already-stored data/tasks.
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 3 -> Task 4 -> Task 6 -> Task 8

---

## Context

### Original Request

User wants this flow:

1. Select project (base project)
2. No base-branch selection
3. Add task => copy full base project into task workspace
4. Show progress bar while copying
5. Task deletion auto-removes copied folder

### Interview Summary

**Key Decisions**:

- Full copy model is required (not `git clone`, not `git worktree`).
- Copy must keep full environment context (`.git`, `.env`, `node_modules`, etc. if present).
- Delete behavior: auto-delete copied folder when task is deleted.
- Automated tests: **No** (for now). Verification uses agent-executed QA scenarios.
- Defaulted behavior: copy failure during task creation is hard-fail with cleanup (no partial task ready state).
- Defaulted behavior: legacy tasks keep fallback opening path for backward compatibility.

**Research Findings**:

- Current flow still creates worktree on task selection in `src/components/kanban/board.tsx:79` and `src/components/kanban/board.tsx:85`.
- Base branch is still present in onboarding/state/store:
  - `src/components/kanban/add-project-dialog.tsx:42`
  - `src/hooks/useKanban.ts:8`
  - `src-tauri/src/store.rs:29`
- Project has no test infrastructure in `package.json:6` and no test configs.

### Metis Review

**Identified Gaps (addressed in this plan)**:

- Copy destination collision risk if keyed only by project name.
- Progress accuracy mismatch risk if counting excludes heavy dirs but copy includes them.
- Delete lifecycle must be atomic (terminal kill + folder delete + task delete).
- Backward compatibility needed for existing stored project/task data.

---

## Work Objectives

### Core Objective

Move task execution workspace from worktree-based behavior to task-scoped full-copy behavior, while keeping UX clear and preventing data-loss edge cases.

### Concrete Deliverables

- Backend commands for task copy create/progress/delete lifecycle.
- Frontend onboarding update removing base-branch field.
- Frontend task creation flow with progress modal.
- Working directory resolution that prefers copied task folder.
- Safe cleanup on task deletion.
- Docs/UI wording update from "worktree" to "task copy" where user-visible.

### Definition of Done

- [ ] Creating a task produces a unique copied workspace folder for that task.
- [ ] Progress bar updates from 0-100 during copy and closes on completion/failure.
- [ ] Deleting a task removes copied folder and task metadata.
- [ ] No active base-branch input remains in onboarding UX/API calls.
- [ ] `npm run check` passes.
- [ ] `cargo check` passes in `src-tauri`.

### Must Have

- Task-scoped copy path (no overwrite between tasks).
- Copy includes hidden files and dependency folders.
- Explicit failure handling and rollback for partial copy.

### Must NOT Have (Guardrails)

- No `git clone` workflow.
- No `git worktree` workflow for new task creation.
- No scope creep into sync-back/refresh-from-base/hardlink optimization.
- No manual/human-only verification criteria.

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> All verifications are agent-executed via commands/tools. No manual clicking or visual-only checks.

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: None (by decision)
- **Framework**: none

### Agent-Executed QA Scenarios (Primary)

- Frontend/UI: Playwright scenario-based verification.
- Backend/API-like commands: Tauri invoke via scripted smoke flow.
- CLI verification: `npm run check`, `cargo check`, targeted grep assertions.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):

- Task 1: Remove base-branch onboarding/state usage (with compatibility)
- Task 2: Introduce canonical task-copy path model + safety guards

Wave 2 (After Wave 1):

- Task 3: Implement task-scoped copy command + progress event contract
- Task 7: Update user-facing copy/worktree terminology and labels

Wave 3 (After Wave 2):

- Task 4: Move copy trigger to Add Task flow + progress modal orchestration
- Task 5: Replace selection-time worktree creation with copy-path resolution + legacy fallback
- Task 6: Atomic task delete cleanup lifecycle

Wave 4 (After Wave 3):

- Task 8: Integration smoke QA script + final verification commands

Critical Path: Task 1 -> Task 3 -> Task 4 -> Task 6 -> Task 8
Parallel Speedup: ~30-40% over sequential

### Dependency Matrix

| Task | Depends On | Blocks  | Can Parallelize With |
| ---- | ---------- | ------- | -------------------- |
| 1    | None       | 3, 4    | 2                    |
| 2    | None       | 3, 5, 6 | 1                    |
| 3    | 1, 2       | 4, 5    | 7                    |
| 4    | 3          | 6, 8    | 5, 7                 |
| 5    | 2, 3       | 8       | 4, 7                 |
| 6    | 4, 5       | 8       | 7                    |
| 7    | 1          | None    | 3, 4, 5, 6           |
| 8    | 4, 5, 6    | None    | None                 |

---

## TODOs

- [x] 1. Remove Base Branch from Onboarding and Active Data Flow

  **What to do**:
  - Remove `baseBranch` field from add-project UI form and submit payload.
  - Update frontend types/hooks to stop requiring/sending `baseBranch` in normal flow.
  - Keep store deserialization backward compatible for already-persisted `base_branch` data.

  **Must NOT do**:
  - Do not break loading of existing `data.json` project records.
  - Do not change unrelated project metadata fields.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: scoped form + type + command signature cleanup.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: keeps onboarding UX clean after field removal.
  - **Skills Evaluated but Omitted**:
    - `git-master`: no git-history investigation needed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3, Task 4
  - **Blocked By**: None

  **References**:
  - `src/components/kanban/add-project-dialog.tsx:20` - current submit signature still carries `baseBranch`.
  - `src/components/kanban/add-project-dialog.tsx:42` - base branch state currently initialized.
  - `src/components/kanban/add-project-dialog.tsx:117` - base branch input section to remove.
  - `src/hooks/useKanban.ts:8` - `Project` interface includes `baseBranch`.
  - `src/hooks/useKanban.ts:68` - `addProject` hook currently passes `baseBranch`.
  - `src-tauri/src/store.rs:29` - persisted model currently has `base_branch`; keep optional read compatibility.
  - `src-tauri/src/store.rs:120` - `add_project` currently accepts `base_branch`.

  **Acceptance Criteria**:
  - [ ] `grep -R "baseBranch" src/components/kanban/add-project-dialog.tsx` returns no active input usage.
  - [ ] Existing `data.json` containing `baseBranch`/`base_branch` still loads without crash.
  - [ ] `npm run check` passes.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Add project without base branch field
    Tool: Playwright
    Preconditions: App running in dev mode
    Steps:
      1. Open add-project dialog
      2. Assert input label "$ base_branch =" is absent
      3. Fill path input with "/tmp/sample-project"
      4. Submit dialog
      5. Assert project appears in project list
    Expected Result: Project created with no base-branch interaction
    Evidence: .sisyphus/evidence/task-1-no-base-branch.png

  Scenario: Legacy project data still loads
    Tool: Bash
    Preconditions: Fixture store JSON includes baseBranch/base_branch
    Steps:
      1. Start app against fixture store
      2. Capture startup logs
      3. Assert no serde/deserialization error in logs
    Expected Result: Startup successful, legacy data tolerated
    Evidence: .sisyphus/evidence/task-1-legacy-load.log
  ```

  **Commit**: YES
  - Message: `refactor(project): remove base branch from onboarding flow`
  - Files: `src/components/kanban/add-project-dialog.tsx`, `src/hooks/useKanban.ts`, `src-tauri/src/store.rs`
  - Pre-commit: `npm run check`

- [x] 2. Define Canonical Task Copy Path + Safety Guards

  **What to do**:
  - Introduce task-scoped workspace path convention under app data (e.g., `.../worktrees/{project_id}/{task_id}` or equivalent).
  - Add guard that prevents deletion/copy operations outside app-managed root.
  - Add helper to resolve task workspace path deterministically.

  **Must NOT do**:
  - Do not key destination by project name only.
  - Do not allow path traversal or external arbitrary delete targets.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: filesystem safety and lifecycle invariants.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: no browser work in this task.
    - `frontend-ui-ux`: no frontend changes in this task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3, Task 5, Task 6
  - **Blocked By**: None

  **References**:
  - `src-tauri/src/worktree.rs:15` - current worktree path helper only uses `project_name/task_id`.
  - `src-tauri/src/worktree.rs:20` - path composition location to refactor.
  - `src-tauri/src/worktree.rs:106` - delete path currently derived from old convention.

  **Acceptance Criteria**:
  - [ ] Path helper returns unique folder per task in same project.
  - [ ] Safety guard rejects any path not under app-managed root.
  - [ ] `cargo check` passes.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Two tasks in one project get unique workspace paths
    Tool: Bash
    Preconditions: fixture project and two task IDs
    Steps:
      1. Invoke path resolver for task A
      2. Invoke path resolver for task B
      3. Assert A path != B path
    Expected Result: No collision
    Evidence: .sisyphus/evidence/task-2-unique-paths.log

  Scenario: Unsafe delete target rejected
    Tool: Bash
    Preconditions: crafted path outside app root
    Steps:
      1. Invoke delete command with external path payload
      2. Assert command returns error status
      3. Assert external path still exists
    Expected Result: Operation blocked
    Evidence: .sisyphus/evidence/task-2-safety-guard.log
  ```

  **Commit**: YES
  - Message: `feat(task-copy): add canonical workspace path and safety guards`
  - Files: `src-tauri/src/worktree.rs`
  - Pre-commit: `cd src-tauri && cargo check`

  - [x] 3. Implement Task-Scoped Full Copy Command with Progress Contract

  **What to do**:
  - Add/replace backend command to copy from selected project path into task workspace path.
  - Emit progress events keyed by task ID and project ID.
  - Ensure completion and error events are unambiguous for frontend state transitions.

  **Must NOT do**:
  - Do not emit global progress without task identity.
  - Do not report 100% before actual copy completion event.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: backend command API contract + stateful progress events.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `ui-ux-pro-max`: no visual design required here.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 7)
  - **Blocks**: Task 4, Task 5
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `src-tauri/src/worktree.rs:157` - existing copy command seed.
  - `src-tauri/src/worktree.rs:163` - current destination logic causing collision risk.
  - `src-tauri/src/worktree.rs:186` - current progress callback pattern.
  - `src-tauri/src/lib.rs:132` - command registration list to update.

  **Acceptance Criteria**:
  - [ ] Copy command accepts `task_id`, `project_id`, `project_path`.
  - [ ] Progress event payload includes `task_id`, `progress`, `copied_files`, `total_files`.
  - [ ] Completion returns copied task path.
  - [ ] Failure returns structured error without partial silent success.
  - [ ] `cd src-tauri && cargo check` passes.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Full copy creates task workspace including dotfiles
    Tool: Bash
    Preconditions: fixture project has .git and .env
    Steps:
      1. Invoke copy command with fixture project and task ID
      2. Assert returned path exists
      3. Assert returned path contains .git and .env
    Expected Result: Full copy preserved hidden files
    Evidence: .sisyphus/evidence/task-3-full-copy.log

  Scenario: Invalid source path fails cleanly
    Tool: Bash
    Preconditions: non-existent source path
    Steps:
      1. Invoke copy command with invalid path
      2. Assert error code/message returned
      3. Assert destination path does not exist
    Expected Result: No partial workspace left behind
    Evidence: .sisyphus/evidence/task-3-invalid-path.log
  ```

  **Commit**: YES
  - Message: `feat(task-copy): create task-scoped copy command with progress events`
  - Files: `src-tauri/src/worktree.rs`, `src-tauri/src/lib.rs`
  - Pre-commit: `cd src-tauri && cargo check`

- [ ] 4. Trigger Copy on Add Task + Drive Progress Modal

  **What to do**:
  - Move copy trigger from task-selection side effect to add-task flow.
  - Open progress modal immediately after task create intent.
  - Update modal via progress events; close on success; surface failure state with retry/cancel path.

  **Must NOT do**:
  - Do not keep lazy copy-on-select behavior for new tasks.
  - Do not leave modal stuck open on error.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: event-driven UX orchestration and progress presentation.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: maintain clear user feedback through loading/failure/success states.
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: not needed during coding, only optional QA runtime.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 6)
  - **Blocks**: Task 6, Task 8
  - **Blocked By**: Task 3

  **References**:
  - `src/components/kanban/board.tsx:79` - existing selection-time loading state.
  - `src/components/kanban/board.tsx:85` - current `create_worktree` invocation to remove from this point.
  - `src/components/kanban/board.tsx:177` - current add-task handler integration point.
  - `src/components/kanban/board.tsx:244` - progress event listener location.
  - `src/components/kanban/progress-dialog.tsx:19` - existing progress dialog component.

  **Acceptance Criteria**:
  - [x] Add Task starts copy immediately and opens progress modal.
  - [x] Progress bar visibly increments from backend events.
  - [x] On success modal closes and task becomes selectable.
  - [x] On failure modal shows failure state and no broken task workspace remains.
  - [ ] `npm run check` passes.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Add task shows live progress then success
    Tool: Playwright
    Preconditions: app running, project selected
    Steps:
      1. Click add-task button
      2. Fill title "copy-flow-test"
      3. Submit
      4. Assert progress dialog opens with "Copying Project"
      5. Assert percentage text increases over time
      6. Wait until dialog closes
      7. Assert new task exists and is ready
    Expected Result: Copy occurs during creation, not selection
    Evidence: .sisyphus/evidence/task-4-progress-success.png

  Scenario: Copy failure shows recoverable error state
    Tool: Playwright
    Preconditions: project path changed to invalid during test fixture
    Steps:
      1. Trigger add task
      2. Wait for copy attempt
      3. Assert error message visible in modal
      4. Assert no orphan workspace path exists
    Expected Result: Failure is explicit and safe
    Evidence: .sisyphus/evidence/task-4-progress-fail.png
  ```

  **Commit**: YES
  - Message: `feat(task): run full copy on task creation with progress modal`
  - Files: `src/components/kanban/board.tsx`, `src/components/kanban/progress-dialog.tsx`
  - Pre-commit: `npm run check`

- [ ] 5. Replace Worktree Selection Logic with Working Dir Resolution + Legacy Fallback

  **What to do**:
  - Remove new-task dependency on `create_worktree` during selection.
  - Resolve terminal/diff working directory from task copy path.
  - Keep fallback for pre-existing legacy tasks where copy path may not exist.

  **Must NOT do**:
  - Do not break opening older tasks.
  - Do not retain user-visible "creating worktree..." language.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
    - Reason: deterministic state transition cleanup.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `ui-ux-pro-max`: no visual redesign needed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 2, Task 3

  **References**:
  - `src/components/kanban/board.tsx:280` - current loading text says "creating worktree...".
  - `src-tauri/src/worktree.rs:138` - current `get_task_working_dir` behavior.
  - `src/components/kanban/canvas-terminal.tsx` - task working dir consumer.
  - `src/components/kanban/diff-view.tsx` - task working dir consumer.

  **Acceptance Criteria**:
  - [x] Selecting an already-created task does not trigger workspace creation call.
  - [x] Terminal and diff both use resolved task copy path.
  - [x] Legacy tasks without copy path still open via fallback path.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Selecting task does not recreate workspace
    Tool: Bash
    Preconditions: one task already copied
    Steps:
      1. Select task in UI automation
      2. Monitor backend logs/events
      3. Assert no create-copy command fired
    Expected Result: Selection is read-only action
    Evidence: .sisyphus/evidence/task-5-no-recreate.log

  Scenario: Legacy task still opens
    Tool: Playwright
    Preconditions: fixture legacy task without copy path
    Steps:
      1. Select legacy task
      2. Assert terminal renders with fallback working dir
      3. Assert diff view loads without crash
    Expected Result: Backward compatibility preserved
    Evidence: .sisyphus/evidence/task-5-legacy-fallback.png
  ```

  **Commit**: YES
  - Message: `refactor(task): resolve working dir from task copy and legacy fallback`
  - Files: `src/components/kanban/board.tsx`, `src-tauri/src/worktree.rs`
  - Pre-commit: `npm run check && cd src-tauri && cargo check`

- [ ] 6. Make Task Deletion Atomic (Kill Terminal -> Remove Copy -> Delete Record)

  **What to do**:
  - Introduce single backend or orchestrated flow guaranteeing delete order.
  - Ensure terminal session is killed before folder deletion.
  - Remove task metadata only after cleanup succeeds (or explicit compensated failure policy).

  **Must NOT do**:
  - Do not delete metadata first and leave orphan folders.
  - Do not skip cleanup when task deleted from task list action.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: lifecycle integrity across terminal/store/filesystem.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: UI-only tooling not required for core deletion contract.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5)
  - **Blocks**: Task 8
  - **Blocked By**: Task 4, Task 5

  **References**:
  - `src/components/kanban/board.tsx:19` - existing terminal kill helper.
  - `src/components/kanban/board.tsx:113` - project deletion currently performs extra cleanup flow.
  - `src/hooks/useKanban.ts:109` - current task delete only removes store record.
  - `src-tauri/src/store.rs:181` - backend task delete currently metadata-only.
  - `src-tauri/src/worktree.rs:100` - remove workspace command to integrate.

  **Acceptance Criteria**:
  - [x] Task delete triggers terminal kill before folder delete.
  - [x] Task folder removed from disk when delete succeeds.
  - [x] Task metadata removed from store.
  - [x] On cleanup failure, user receives explicit error and no silent partial state.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Delete active task performs full cleanup
    Tool: Playwright + Bash
    Preconditions: task running terminal + existing copied folder
    Steps:
      1. Trigger delete task action
      2. Assert terminal process no longer running
      3. Assert task folder path absent on filesystem
      4. Reload app data, assert task id absent
    Expected Result: Atomic cleanup completed
    Evidence: .sisyphus/evidence/task-6-atomic-delete.log

  Scenario: Folder delete permission failure is surfaced
    Tool: Bash
    Preconditions: fixture folder set non-removable for test
    Steps:
      1. Trigger delete task
      2. Assert error response returned
      3. Assert task record not silently removed (or explicit compensated state)
    Expected Result: Consistent failure handling
    Evidence: .sisyphus/evidence/task-6-delete-failure.log
  ```

  **Commit**: YES
  - Message: `fix(task): make deletion lifecycle atomic with workspace cleanup`
  - Files: `src/hooks/useKanban.ts`, `src/components/kanban/board.tsx`, `src-tauri/src/store.rs`, `src-tauri/src/worktree.rs`
  - Pre-commit: `npm run check && cd src-tauri && cargo check`

  - [x] 7. Update Product Language from Worktree to Task Copy

  **What to do**:
  - Update visible strings and docs to match new mental model.
  - Keep developer-internal names consistent enough to avoid confusion.

  **Must NOT do**:
  - Do not rewrite full docs beyond affected sections.
  - Do not change unrelated branding or layout.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: terminology cleanup across UX and docs.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no layout redesign needed.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:
  - `README.md:13` - current "Task Engine" text mentions worktree behavior.
  - `README.md:57` - "Each task spawns an isolated worktree" statement.
  - `src/components/kanban/board.tsx:283` - loading string currently says "creating worktree...".

  **Acceptance Criteria**:
  - [ ] User-visible copy/worktree terminology matches new behavior.
  - [ ] No contradictory docs remain in key onboarding/readme sections.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: UI no longer shows worktree wording
    Tool: Playwright
    Preconditions: app running
    Steps:
      1. Trigger task creation and loading states
      2. Assert visible text does not contain "worktree"
    Expected Result: Copy-based wording only
    Evidence: .sisyphus/evidence/task-7-ui-wording.png

  Scenario: README key flow updated
    Tool: Bash
    Preconditions: repository available
    Steps:
      1. grep README for "worktree"
      2. Validate retained mentions are historical/intentional only
    Expected Result: No misleading behavior docs
    Evidence: .sisyphus/evidence/task-7-readme-grep.log
  ```

  **Commit**: YES
  - Message: `docs(flow): rename worktree flow to task copy flow`
  - Files: `README.md`, `src/components/kanban/board.tsx` (text only)
  - Pre-commit: `npm run check`

  - [x] 8. Add Deterministic Smoke QA Entry and Final Verification Gate

  **What to do**:
  - Add one scripted smoke command (non-unit-test) to validate create-copy/delete-cleanup in CI/dev.
  - Capture evidence artifacts under `.sisyphus/evidence/`.
  - Run final verification suite.

  **Must NOT do**:
  - Do not introduce full test framework setup in this scope.
  - Do not rely on manual QA only.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: final wiring and deterministic command integration.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: not needed unless release commit shaping requested.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (final)
  - **Blocks**: None
  - **Blocked By**: Task 4, Task 5, Task 6

  **References**:
  - `package.json:6` - scripts section to add smoke command.
  - `src-tauri/src/lib.rs:132` - confirm all invoked commands registered.
  - `.sisyphus/plans/project-copy-task-flow.md` - use this plan's criteria as script assertions.

  **Acceptance Criteria**:
  - [ ] `npm run qa:task-copy-smoke` exits 0.
  - [ ] Output includes markers:
    - `COPY_CREATED_OK`
    - `DOTFILES_COPIED_OK`
    - `TASK_DELETE_REMOVED_FOLDER_OK`
  - [ ] `npm run check` exits 0.
  - [ ] `cd src-tauri && cargo check` exits 0.

  **Agent-Executed QA Scenarios**:

  ```text
  Scenario: Smoke script validates end-to-end lifecycle
    Tool: Bash
    Preconditions: fixture project directory prepared
    Steps:
      1. Run npm run qa:task-copy-smoke
      2. Assert exit code 0
      3. Assert output markers all present
    Expected Result: End-to-end lifecycle verified
    Evidence: .sisyphus/evidence/task-8-smoke.log

  Scenario: Final build/lint gate passes
    Tool: Bash
    Preconditions: all implementation tasks complete
    Steps:
      1. Run npm run check
      2. Run cd src-tauri && cargo check
      3. Assert both exit code 0
    Expected Result: Repository healthy after migration
    Evidence: .sisyphus/evidence/task-8-final-check.log
  ```

  **Commit**: YES
  - Message: `chore(qa): add task copy lifecycle smoke verification`
  - Files: `package.json`, `scripts/*` (or equivalent), optional docs note
  - Pre-commit: `npm run check && cd src-tauri && cargo check`

---

## Commit Strategy

| After Task | Message                                                        | Files                                                 | Verification                                   |
| ---------- | -------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------- |
| 1          | `refactor(project): remove base branch from onboarding flow`   | UI + hook + store                                     | `npm run check`                                |
| 2-3        | `feat(task-copy): add task-scoped copy lifecycle and progress` | `src-tauri/src/worktree.rs`, `src-tauri/src/lib.rs`   | `cd src-tauri && cargo check`                  |
| 4-5        | `feat(task): create copy on add and resolve working dir`       | `src/components/kanban/board.tsx`, related components | `npm run check`                                |
| 6          | `fix(task): atomic delete cleanup for task workspace`          | hook/store/worktree/board                             | `npm run check && cd src-tauri && cargo check` |
| 7          | `docs(flow): rename worktree flow to task copy flow`           | README + UI strings                                   | `npm run check`                                |
| 8          | `chore(qa): add smoke verification for task copy lifecycle`    | scripts + package scripts                             | `npm run check && cd src-tauri && cargo check` |

---

## Success Criteria

### Verification Commands

```bash
npm run qa:task-copy-smoke
# Expected: exit 0 and markers COPY_CREATED_OK, DOTFILES_COPIED_OK, TASK_DELETE_REMOVED_FOLDER_OK

npm run check
# Expected: exit 0

cd src-tauri && cargo check
# Expected: Finished dev profile with no errors
```

### Final Checklist

- [ ] All new tasks use full-copy workflow, not worktree workflow.
- [ ] Base branch onboarding removed from active UX.
- [ ] Progress bar shown during copy and closes predictably.
- [ ] Task deletion removes workspace folder automatically.
- [ ] Legacy stored data/tasks remain usable.
- [ ] No manual-only verification steps required.
