# Learnings from Task 1: Frontend Test Infrastructure Setup

## Vitest Configuration

- **Issue**: The @ alias wasn't resolving properly in vitest.config.ts
- **Solution**: Changed from string path `'./src'` to `path.resolve(__dirname, './src')` for proper alias resolution
- **Key**: Vitest uses Vite's configuration, so path alias resolution requires full path resolution

## Playwright Configuration

- **Dev Server**: Configured webServer to run `npm run dev` before tests
- **URL**: Set to `http://localhost:1420` (matching tauri.conf.json devUrl)
- **Reuse**: `reuseExistingServer: !process.env.CI` for development convenience
- **Timeout**: 120s to allow server startup time

## Testing Setup

- **Environment**: Using jsdom with custom URL configuration to simulate the app's development environment
- **Setup File**: src/test/setup.ts includes @testing-library/jest-dom matchers
- **Path Alias**: Vitest resolves @ alias through path.resolve(), not string literals

## Dependencies Added

- **Unit Tests**: vitest, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom
- **E2E Tests**: @playwright/test
- **Coverage**: vitest --coverage

## Scripts Added

- `test`: Generic vitest command
- `test:unit`: Run unit tests with vitest (primary script)
- `test:e2e`: Run end-to-end tests with playwright
- `test:coverage`: Generate coverage reports

## Smoke Test

- Created src/app.test.tsx with a simple test that renders App component
- Test passes but shows warnings about Tauri API calls (expected since testing-library runs in DOM environment, not Tauri)
- Test verifies App renders without crashing and contains "novercode" text

## Known Limitations

- Tauri API calls (like invoke) will fail in unit tests because they require Tauri backend
- Need to mock Tauri commands in tests or skip them
- Act() warnings during component render - can be fixed with proper async rendering

# Learnings from Task 3: Interaction-first Canvas Selection

## Selection Utilities (GREEN)

- Implemented `pixelToCell(x, y)` with fixed metrics (`CELL_WIDTH=9`, `CELL_HEIGHT=17`) using floor division.
- Implemented `normalizeRect(start, end)` by min/max normalization for row and col bounds.
- Implemented `extractBlockText(cells, rect)` with row-wise extraction, spacer-cell skipping, and newline-preserving block output.

## Pointer Precedence Matrix Implementation

- Added pointer handlers on `<canvas>`: `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`.
- Precedence now follows plan:
  1. `Alt/Option` held -> local rectangular selection start/update/end.
  2. Else if terminal reports `is_alt_screen` -> send normalized mouse events to `terminal_mouse_input`.
  3. Else -> keep existing behavior (focus + keyboard/IME path untouched).

## Selection State + Overlay

- Added ref-based selection state in `canvas-terminal`:
  - `selectionStartRef`, `selectionEndRef`, `isSelectingRef`, `isAltHeldRef`.
- Render loop now paints selection overlay rectangles on top of terminal content using `rgba(0, 255, 0, 0.3)`.
- Cell normalization from pointer coordinates is clamped to terminal bounds before rendering/copy extraction.

## Copy Action

- Added explicit `Copy Selection` action button that appears when selection exists.
- Copy uses `navigator.clipboard.writeText(extractBlockText(...))` and does not intercept `Cmd/Ctrl+C`.

## Learnings from Task: Terminal Mouse Protocol Backend

- Added `terminal_mouse_input` in `src-tauri/src/terminal.rs` using the same session lookup and sender flow as `terminal_write`.
- Encapsulated SGR encoding in `encode_mouse_sgr(event, button, col, row, modifiers)` to keep command logic simple and make byte-level tests deterministic.
- Implemented event handling exactly for `press`, `release`, `drag`, and `wheel` with SGR 1006 suffix rules: `M` for press/drag/wheel and `m` for release.
- Applied XTerm button semantics: base button code plus modifier mask, plus `+32` motion flag for drag, and explicit wheel validation for button codes `64` and `65`.
- Added focused unit tests (`mouse_protocol_*`) that assert exact encoded bytes for left press/release, drag with left button, and wheel up/down.

# Learnings from Task: Playwright E2E Test Infrastructure

## Test File Placement

- **Issue**: Playwright couldn't find tests in `tests/` directory
- **Root Cause**: `playwright.config.ts` has `testDir: './tests/e2e'` but tests were created directly in `tests/`
- **Solution**: Moved test file to `tests/e2e/terminal-canvas.spec.ts`

## Test Structure

- Created 12 total tests (4 tests × 3 browser projects: chromium, firefox, webkit)
- Tests verify:
  1. App loads at http://localhost:1420
  2. Basic UI elements are present (header, main app container)
  3. Responsive design across different viewport sizes
  4. Placeholder for canvas selection behavior

## CI Integration

- Added new `test` job to `.github/workflows/ci.yml`
- Job runs after `check` job to ensure deterministic test order
- Steps:
  1. Install dependencies (`npm ci`)
  2. Install Playwright browsers (`npx playwright install --with-deps`)
  3. Run unit tests (`npm run test:unit`)
  4. List E2E tests (`npm run test:e2e -- --list`)
  5. Tests run in parallel with retry on failure (2 retries in CI)

## Tauri Testing Considerations

- Full E2E testing of Tauri apps requires:
  - Dedicated Tauri automation setup (manual window management)
  - Special handling for native window controls
  - Integration tests for backend commands
- Current implementation focuses on:
  - Verifying app loads in browser environment
  - Testing frontend rendering and responsiveness
  - Providing test structure for future canvas-specific E2E tests
