# novercode

> The missing link between IDEs and terminal workflows.

**novercode** is a vibe-coding environment for engineers who live in the terminal. It's not an IDE — it's a workflow layer that sits between you and your code, handling the boring stuff so you can stay in flow.

![macOS](https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple)
![Linux](https://img.shields.io/badge/Linux-000000?style=flat-square&logo=linux)
![Windows](https://img.shields.io/badge/Windows-000000?style=flat-square&logo=windows)

## What It Is

- **Project Hub** — Manage multiple Git repos from one place
- **Task Engine** — Each task gets its own isolated worktree
- **AI Terminal** — Built-in Claude shell, no context switching
- **Diff Viewer** — Side-by-side code review with Monaco

## What It's Not

- Not a code editor (use your favorite)
- Not a full IDE (no bloated features you won't use)
- Not a web app (native speed, offline-first)

## Quick Start

```bash
# Clone
git clone https://github.com/noverwork/novercode.git
cd novercode

# Install
npm install

# Dev
npm run tauri dev

# Build
npm run tauri build
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  PROJECT              │  TASK               │  AI TERM     │
│  ───────────────────  │  ─────────────────  │  ─────────   │
│  ┌─────────────────┐  │  ┌────────────────┐ │  $ claude    │
│  │ my-app          │  │  │ fix auth bug   │ │  > help me   │
│  │ api-server      │  │  │ add dark mode  │ │  > review    │
│  │ frontend        │  │  │ refactor db    │ │  > commit    │
│  └─────────────────┘  │  └────────────────┘ │              │
│                       │                    │  [assistant] │
│  [New Project]        │  [New Task]         │              │
└─────────────────────────────────────────────────────────────┘
```

**1. Add Projects** → Point to any Git repo on your machine
**2. Create Tasks** → Each task spawns an isolated worktree
**3. Code** → Use your editor (VS Code, Neovim, whatever)
**4. Ask AI** → Built-in Claude shell for assistance
**5. Done** → Worktree auto-cleans when task closes

## The Vibe

- Terminal aesthetic that doesn't pretend to be a GUI
- Monospace everything
- CRT scanlines because why not
- Keyboard-first, mouse-optional
- Works offline

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Backend | Rust + Tauri |
| Terminal | Alacritty emulation engine |
| Editor | Monaco (diff viewer) |
| Storage | Tauri store plugin |

## Why Worktrees?

```
project/
├── main/          # Your main branch
├── task-001/      # Isolated worktree for task 1
├── task-002/      # Isolated worktree for task 2
└── task-003/      # Isolated worktree for task 3
```

Each task gets its own sandbox. Context switching without `git stash` hell. Hot-swap between tasks instantly.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd/Ctrl + N` | New task |
| `Cmd/Ctrl + Enter` | Open in editor |
| `Cmd/Ctrl + K` | Focus AI terminal |
| `Cmd/Ctrl + D` | Toggle diff view |

## Development

```bash
# Dev server (frontend only)
npm run dev

# Full Tauri dev (frontend + backend)
npm run tauri dev

# Type check
npm run build

# Lint
npm run lint
```

## Build for Distribution

```bash
# Build for current platform
npm run tauri build

# Output: src-tauri/target/release/bundle/
```

## License

MIT — use it for good, don't use it for evil.

---

**Built with Tauri** — [https://tauri.app](https://tauri.app)
