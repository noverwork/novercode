# Canvas Terminal TUI Interaction and Block Selection

## TL;DR

> **Quick Summary**: Keep the current canvas renderer, make mouse behavior TUI-first, and add modifier-gated rectangular selection so interaction stays native while selection remains available.
>
> **Deliverables**:
>
> - Mouse interaction pipeline for canvas terminal (click/drag/wheel -> terminal behavior)
> - Rectangular selection overlay activated only with `Alt/Option`
> - New automated test infrastructure (frontend + E2E) and deterministic protocol tests
> - CI updates to run the new tests
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 0 -> Task 1 -> Task 3 -> Task 4

---

## Context

### Original Request

Design a method so canvas terminal can interact like TUI, while still allowing text selection on canvas.

### Interview Summary

**Key Discussions**:

- User does not want xterm.js migration.
- Selection mode chosen: rectangular/block selection.
- Interaction policy chosen: interaction-first.
- User does not want copy-shortcut interception as primary behavior.
- User approved adding test infrastructure first.

**Research Findings**:

- Existing interaction code is in `src/components/kanban/canvas-terminal.tsx`.
- Keyboard input already routes through `terminal_write` and should stay intact.
- Wheel currently calls `terminal_scroll`; this must be reconciled with TUI-first mouse behavior.
- Repo currently has no frontend automated test stack or CI test job.

### Metis Review

**Identified Gaps (addressed)**:

- Gap: mouse/wheel precedence was ambiguous -> resolved by explicit precedence matrix.
- Gap: copy behavior without shortcut interception was unclear -> resolved with explicit non-intercept copy action (context action).
- Gap: protocol correctness risk -> resolved with byte-accurate tests for mouse encoding.
- Gap: mode leakage across tabs -> resolved with per-terminal selection/mouse state only.

---

## Work Objectives

### Core Objective

Implement TUI-first canvas mouse interaction with modifier-gated rectangular selection, without changing the rendering engine and without breaking existing keyboard/IME terminal input.

### Concrete Deliverables

- `src/components/kanban/canvas-terminal.tsx` updated with pointer interaction state and rectangular selection rendering.
- Non-intercept copy action for selected block text (explicit UI/context action, not `Cmd/Ctrl+C` interception).
- `src-tauri/src/terminal.rs` extended with mouse input handling/encoding and tests.
- `src-tauri/src/lib.rs` command registration updated if new command is added.
- Frontend test setup (`vitest`, `@testing-library/react`, Playwright) added and wired in scripts/CI.

### Definition of Done

- [x] Canvas drag without modifier behaves as terminal interaction in TUI mode.
- [x] Holding `Alt/Option` enables rectangular selection overlay and text extraction.
- [x] Existing keyboard/IME path still works unchanged.
- [x] Automated tests and CI test job pass.

### Must Have

- Interaction-first policy implemented.
- Rectangular selection only when modifier is active.
- Deterministic mouse protocol tests (press/release/move/wheel).
- Agent-executable QA only (no manual verification steps).

### Must NOT Have (Guardrails)

- No xterm.js migration.
- No `Cmd/Ctrl+C` interception as primary copy behavior.
- No global app-level selection state shared across terminals/tasks.
- No unrelated terminal lifecycle changes (create/kill/resize semantics remain stable).

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: TDD (after setup task)
- **Framework**: Vitest + Testing Library + Playwright + Rust unit tests

### If TDD Enabled

Each feature task follows RED-GREEN-REFACTOR:

1. RED: write failing tests for selection/mouse protocol behavior.
2. GREEN: implement minimum code to pass.
3. REFACTOR: simplify handlers/encoders while keeping tests green.

**Test Setup Task**:

- Install and configure frontend unit + integration test stack.
- Add scripts and CI command wiring before feature implementation tasks proceed.

### Agent-Executed QA Scenarios (MANDATORY - ALL tasks)

Every task below includes explicit scenarios using `Bash`, `Playwright`, or both.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 0: Setup test infrastructure
└── Task 2: Draft frontend selection utility tests (RED only)

Wave 2 (After Wave 1):
├── Task 1: Backend mouse protocol command + tests
└── Task 3: Frontend interaction-first handlers + selection overlay

Wave 3 (After Wave 2):
└── Task 4: E2E Playwright scenarios + CI integration

Critical Path: Task 0 -> Task 1 -> Task 3 -> Task 4
Parallel Speedup: ~30% vs sequential
```

### Dependency Matrix

| Task | Depends On | Blocks  | Can Parallelize With  |
| ---- | ---------- | ------- | --------------------- |
| 0    | None       | 1, 3, 4 | 2 (RED-only drafting) |
| 1    | 0          | 3, 4    | 3                     |
| 2    | None       | 3       | 0                     |
| 3    | 0, 1, 2    | 4       | None                  |
| 4    | 0, 1, 3    | None    | None                  |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents                                                                                        |
| ---- | ----- | --------------------------------------------------------------------------------------------------------- |
| 1    | 0, 2  | `task(category="quick", load_skills=["playwright"], run_in_background=false)` for test setup/RED drafting |
| 2    | 1, 3  | `task(category="unspecified-high", load_skills=["playwright"], run_in_background=false)`                  |
| 3    | 4     | `task(category="quick", load_skills=["playwright"], run_in_background=false)`                             |

---

## TODOs

- [x] 0. Setup frontend test infrastructure and scripts

  **What to do**:
  - Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, and Playwright.
  - Create test config and setup files.
  - Add scripts: `test`, `test:unit`, `test:e2e`, `test:coverage`.
  - Add at least one smoke unit test proving setup works.

  **Must NOT do**:
  - Do not alter runtime app behavior in this task.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: mostly tooling and config wiring.
  - **Skills**: [`playwright`]
    - `playwright`: needed for immediate E2E harness validation.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: not needed for infra-only task.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: 1, 3, 4
  - **Blocked By**: None

  **References**:
  - `package.json:6` - existing scripts location; add test scripts consistently.
  - `.github/workflows/ci.yml:10` - current CI jobs; baseline for adding test execution.
  - `src/components/kanban/canvas-terminal.tsx:37` - target component for upcoming tests.

  **Acceptance Criteria**:
  - [ ] `npm run test:unit` executes successfully (new script exists).
  - [ ] `npm run test:e2e -- --list` executes and lists tests.
  - [ ] `npm run check:all` still passes.

  **Agent-Executed QA Scenarios**:

  ```bash
  Scenario: Unit test harness boots
    Tool: Bash
    Preconditions: dependencies installed
    Steps:
      1. Run: npm run test:unit
      2. Assert: exit code is 0
      3. Assert: output contains "passed"
    Expected Result: unit harness is operational
    Failure Indicators: missing script, module resolution errors, non-zero exit
    Evidence: .sisyphus/evidence/task-0-unit-harness.txt

  Scenario: E2E harness is discoverable
    Tool: Bash
    Preconditions: Playwright configured
    Steps:
      1. Run: npm run test:e2e -- --list
      2. Assert: output contains at least one spec name
    Expected Result: Playwright setup recognized by runner
    Evidence: .sisyphus/evidence/task-0-e2e-list.txt
  ```

  **Commit**: YES
  - Message: `test(setup): add frontend unit and e2e test infrastructure`

- [x] 1. Add backend mouse protocol handling with deterministic tests

  **What to do**:
  - Add a terminal mouse input command in `src-tauri/src/terminal.rs` (or equivalent helper path) that converts normalized mouse events to terminal input bytes.
  - Support required events: left press/release, drag motion, wheel up/down.
  - Keep mode-precedence explicit (TUI/ALT_SCREEN behavior first).
  - Add Rust unit tests for exact encoded byte sequences.

  **Must NOT do**:
  - Do not rewrite existing keyboard `terminal_write` flow.
  - Do not remove existing `terminal_scroll` behavior without explicit replacement matrix.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: protocol correctness and compatibility risk.
  - **Skills**: []
    - No specific built-in skill is required for Rust protocol work.
  - **Skills Evaluated but Omitted**:
    - `playwright`: not needed at pure backend protocol stage.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: 3, 4
  - **Blocked By**: 0

  **References**:
  - `src-tauri/src/terminal.rs:445` - existing byte input path (`terminal_write`) to reuse.
  - `src-tauri/src/terminal.rs:533` - existing wheel behavior and ALT_SCREEN branch.
  - `src-tauri/src/lib.rs:132` - command registration list for new invoke command.
  - `src-tauri/src/terminal.rs:507` - current Rust test module pattern.

  **Acceptance Criteria**:
  - [ ] Rust tests include byte assertions for press/release/drag/wheel.
  - [ ] `cd src-tauri && cargo test` passes.
  - [ ] No regression to existing terminal commands (`terminal_write`, `terminal_scroll`).

  **Agent-Executed QA Scenarios**:

  ```bash
  Scenario: Mouse protocol encoding vectors pass
    Tool: Bash
    Preconditions: new rust tests added
    Steps:
      1. Run: cd src-tauri && cargo test mouse_protocol -- --nocapture
      2. Assert: output contains "test result: ok"
      3. Assert: output contains "0 failed"
    Expected Result: deterministic byte encoding verified
    Evidence: .sisyphus/evidence/task-1-rust-mouse-tests.txt
  ```

  **Commit**: YES
  - Message: `feat(terminal): add mouse protocol input handling with tests`

- [x] 2. Define rectangular selection extraction utilities (RED-first)

  **What to do**:
  - Add pure utilities for:
    - pixel -> cell mapping,
    - rectangular range normalization,
    - selected text extraction from `cells` (skip spacer cells; handle wide chars safely).
  - Write failing unit tests first for edge cases.

  **Must NOT do**:
  - Do not couple utility logic to React state or DOM.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: isolated deterministic utility logic.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: unnecessary for pure utility unit tests.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 0)
  - **Blocks**: 3
  - **Blocked By**: None

  **References**:
  - `src/components/kanban/canvas-terminal.tsx:31` - fixed cell metrics constants.
  - `src/components/kanban/canvas-terminal.tsx:95` - grid/cell traversal rules.
  - `src/components/kanban/canvas-terminal.tsx:100` - spacer-cell handling rule.

  **Acceptance Criteria**:
  - [ ] Unit tests cover rectangle normalization and extraction edge cases.
  - [ ] Unit tests verify wide+spacer behavior does not duplicate characters.

  **Agent-Executed QA Scenarios**:

  ```bash
  Scenario: Rectangular extraction rules pass edge cases
    Tool: Bash
    Preconditions: test file exists for selection utilities
    Steps:
      1. Run: npm run test:unit -- src/components/kanban/__tests__/canvas-selection-utils.test.ts
      2. Assert: output includes case names for wide/spacer handling
      3. Assert: 0 failed
    Expected Result: extraction algorithm is stable and deterministic
    Evidence: .sisyphus/evidence/task-2-selection-utils-tests.txt
  ```

  **Commit**: YES
  - Message: `test(canvas): add rectangular selection utility tests`

- [x] 3. Implement interaction-first canvas handlers and selection overlay

  **What to do**:
  - Add pointer handlers (`down/move/up`) in `canvas-terminal`.
  - Implement precedence matrix:
    - If `Alt/Option` held -> local rectangular selection mode.
    - Else if terminal is in ALT_SCREEN -> send normalized mouse events to terminal command.
    - Else (non-ALT shell) -> keep existing non-mouse interaction behavior and do not inject click/drag protocol bytes.
    - Wheel keeps current fallback path in non-selection mode; selection mode does not inject terminal wheel events.
  - Render selection overlay on top of canvas content.
  - Add explicit copy action (for example context action button) that copies current block selection without key interception.
  - Keep hidden textarea focus and existing keyboard/IME behavior unchanged.

  **Must NOT do**:
  - Do not intercept `Cmd/Ctrl+C` as default copy path.
  - Do not introduce global mode toggles/settings in this iteration.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: mixed event-state-render logic with regressions risk.
  - **Skills**: [`playwright`]
    - `playwright`: needed to validate actual browser pointer behavior.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: feature is interaction correctness, not visual redesign.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 1)
  - **Blocks**: 4
  - **Blocked By**: 0, 1, 2

  **References**:
  - `src/components/kanban/canvas-terminal.tsx:56` - render loop insertion point for selection overlay.
  - `src/components/kanban/canvas-terminal.tsx:217` - keyboard input path that must remain unchanged.
  - `src/components/kanban/canvas-terminal.tsx:347` - existing wheel handler to refactor with precedence.
  - `src/components/kanban/canvas-terminal.tsx:398` - container event attachment point.
  - `src/components/kanban/terminal-panel.tsx:64` - per-terminal mount lifecycle (avoid state leakage across tabs).

  **Acceptance Criteria**:
  - [ ] Drag without modifier emits terminal mouse interactions (no selection overlay).
  - [ ] Drag with `Alt/Option` produces rectangular highlight and extractable selected text.
  - [ ] Explicit copy action copies selected block text to clipboard without `Cmd/Ctrl+C` interception.
  - [ ] Existing key entry (`Enter`, arrows, IME composition) still works.

  **Agent-Executed QA Scenarios**:

  ```bash
  Scenario: TUI interaction path without modifier
    Tool: Playwright (playwright skill)
    Preconditions: app running, terminal panel visible, task selected
    Steps:
      1. Navigate to app window and focus terminal canvas container `.flex-1.overflow-hidden.focus\:outline-none.relative`
      2. Mouse down at canvas center, drag 120px right, mouse up (no modifier)
      3. Assert no selection overlay state marker/class is present
      4. Assert terminal interaction side effect appears (event log/spy or expected TUI cursor reaction hook)
      5. Screenshot: .sisyphus/evidence/task-3-no-modifier-drag.png
    Expected Result: interaction is passed through to terminal, not consumed as selection
    Evidence: .sisyphus/evidence/task-3-no-modifier-drag.png

  Scenario: Rectangular selection path with Alt/Option
    Tool: Playwright (playwright skill)
    Preconditions: same as above
    Steps:
      1. Hold `Alt`
      2. Mouse down near row 5 col 5, drag to row 10 col 20, mouse up
      3. Release `Alt`
      4. Assert rectangular overlay is rendered for selected rows/cols
      5. Assert exported selected text contains line breaks for each selected row
      6. Screenshot: .sisyphus/evidence/task-3-alt-selection.png
    Expected Result: block selection appears only during modifier path
    Evidence: .sisyphus/evidence/task-3-alt-selection.png
  ```

  **Commit**: YES
  - Message: `feat(canvas-terminal): add interaction-first mouse handling and block selection`

- [x] 4. Add end-to-end regression tests and CI test job

  **What to do**:
  - Add Playwright specs covering interaction-first and modifier-selection behavior.
  - Update CI to run unit and e2e tests in deterministic order.
  - Capture artifacts for failures.

  **Must NOT do**:
  - Do not weaken existing lint/type/rust checks.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: mostly test orchestration and CI wiring.
  - **Skills**: [`playwright`]
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: no UI redesign required.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: None
  - **Blocked By**: 0, 1, 3

  **References**:
  - `.github/workflows/ci.yml:26` - current check step insertion point.
  - `package.json:20` - existing aggregate quality command.
  - `src/components/kanban/canvas-terminal.tsx:398` - DOM event surface targeted by E2E.

  **Acceptance Criteria**:
  - [ ] CI runs new frontend test command(s) and fails on regressions.
  - [ ] Playwright scenarios pass in local and CI execution modes.

  **Agent-Executed QA Scenarios**:

  ```bash
  Scenario: Full frontend interaction regression suite
    Tool: Bash
    Preconditions: test infra and specs implemented
    Steps:
      1. Run: npm run test:unit
      2. Assert: exit code 0
      3. Run: npm run test:e2e
      4. Assert: exit code 0 and all specs pass
    Expected Result: interaction and selection regressions are covered automatically
    Evidence: .sisyphus/evidence/task-4-frontend-suite.txt

  Scenario: CI workflow includes test stage
    Tool: Bash
    Preconditions: workflow updated
    Steps:
      1. Parse `.github/workflows/ci.yml`
      2. Assert: frontend unit test command present
      3. Assert: e2e or interaction regression command present (or dedicated matrix/job)
    Expected Result: CI enforces new behavior continuously
    Evidence: .sisyphus/evidence/task-4-ci-wiring.txt
  ```

  **Commit**: YES
  - Message: `ci(test): add canvas terminal interaction regression checks`

---

## Commit Strategy

| After Task | Message                                                                           | Files                                               | Verification                            |
| ---------- | --------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| 0          | `test(setup): add frontend unit and e2e test infrastructure`                      | `package.json`, test config files                   | `npm run test:unit`                     |
| 1          | `feat(terminal): add mouse protocol input handling with tests`                    | `src-tauri/src/terminal.rs`, `src-tauri/src/lib.rs` | `cd src-tauri && cargo test`            |
| 2-3        | `feat(canvas-terminal): add interaction-first mouse handling and block selection` | `src/components/kanban/canvas-terminal.tsx` + tests | `npm run test:unit -- canvas-terminal`  |
| 4          | `ci(test): add canvas terminal interaction regression checks`                     | `.github/workflows/ci.yml`                          | `npm run test:unit && npm run test:e2e` |

---

## Success Criteria

### Verification Commands

```bash
npm run test:unit
npm run test:e2e
npm run check:all
cd src-tauri && cargo test
```

### Final Checklist

- [x] Interaction-first behavior works in TUI contexts.
- [x] `Alt/Option` rectangular selection works without copy-shortcut interception.
- [x] No keyboard/IME regression in canvas terminal.
- [x] Mouse protocol encoding is covered by deterministic tests.
- [x] CI enforces the new test gates.
