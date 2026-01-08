# Development Setup Guide

This document describes all development configurations and tools used in this project.

## Prerequisites

- Node.js (LTS)
- Rust stable toolchain
- Git with Husky hooks

## Frontend Development

### ESLint Configuration

We use ESLint 9 with the new Flat Config system.

**Configuration file**: `eslint.config.js`

**Key features**:
- TypeScript ESLint for type-aware linting
- React-specific rules with `@eslint-react/eslint-plugin`
- React Hooks enforcement
- React Refresh for HMR safety
- Import/Export sorting with `eslint-plugin-simple-import-sort`
- React Compiler plugin for automatic optimizations

**Rules**:
- Strict unused variables (allows `_` prefix)
- No `any` types (warns only)
- Strict equality checks (`===` not `==`)
- Import sorting enforced
- React Compiler enabled

### Prettier Configuration

Code formatter for consistent code style.

**Configuration file**: `prettier.config.js`

**Style**:
- Semicolons: enabled
- Single quotes
- 2 spaces indentation
- Trailing commas: es5
- Max line width: 100 characters

### TypeScript Configuration

Strict type checking enabled.

**Configuration file**: `tsconfig.json`

**Key settings**:
- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- Path aliases: `@/*` → `./src/*`

## Backend Development (Rust)

### Rust Linting (Clippy)

Modern lint configuration using the `[lints]` table in `Cargo.toml`.

**Lint levels enabled**:
- `rust`: Standard Rust lints
- `clippy.all`: All Clippy lints
- `clippy.pedantic`: Pedantic checks
- `clippy.nursery`: Experimental/new lints

**Key allows** (for pragmatism):
- `unsafe_code`: "allow" (required for audio FFI)
- `needless_pass_by_value`: "allow" (Tauri command signatures)
- Audio-related lints: `cast_*`, `float_cmp`, `suboptimal_flops`
- Drop-related: `significant_drop_tightening`

### Rust Formatting

Code formatting with `rustfmt`.

**Configuration file**: `src-tauri/rustfmt.toml`

**Style**:
- Edition: 2021
- Tab width: 2 spaces
- Max width: 100 characters

### Rust Toolchain

Pinned stable Rust version for consistency.

**Configuration file**: `src-tauri/rust-toolchain.toml`

**Version**: `stable`

This ensures local development and CI/CD use the same Rust compiler version.

## Quality Gates

### NPM Scripts

All quality gate commands in `package.json`:

```bash
# Format code
npm run format              # Format all TS/TSX/CSS/MD files
npm run format:check        # Check formatting without fixing

# Linting
npm run lint                # ESLint check (no warnings allowed)
npm run lint:fix            # Auto-fix ESLint issues
npm run lint:rust           # Run Clippy on Rust code

# Rust formatting
npm run format:rust          # Format all Rust files
npm run format:rust:check     # Check Rust formatting

# Type checking
npm run typecheck           # TypeScript type check

# Complete checks
npm run check:all           # Run ALL quality checks
                              # format:check + lint + typecheck +
                              # format:rust:check + lint:rust
npm run fix:all              # Auto-fix ALL issues
                              # format + lint:fix + format:rust

# Build
npm run build               # Type check + Vite build
npm run tauri dev           # Start Tauri dev environment
npm run tauri build          # Build Tauri app for distribution
```

### Git Hooks

Automated quality enforcement via Husky.

**Pre-commit hook** (`.husky/pre-commit`):
Runs `lint-staged` for fast, incremental checks on modified files only.

**Pre-push hook** (`.husky/pre-push`):
Runs `npm run check:all` to ensure all quality gates pass before code leaves local machine.

### Lint-staged Configuration

Incremental checking for committed files only.

**Configuration**: `package.json` → `lint-staged`

**Staged file rules**:
- `src/**/*.{ts,tsx}` → `eslint --fix` + `prettier --write`
- `src/**/*.{css,md,json}` → `prettier --write`
- `src-tauri/**/*.rs` → `cargo fmt --`

## Continuous Integration

### GitHub Actions

**Configuration file**: `.github/workflows/ci.yml`

**Jobs**:

#### 1. Check Job
Runs on Ubuntu:
- `npm run check:all` - All quality gates

#### 2. Rust Clippy Job
Runs on Ubuntu:
- `cargo clippy --all-targets --all-features -- -D warnings`

#### 3. Rust Fmt Job
Runs on Ubuntu:
- `cargo fmt --all -- --check`

#### 4. Build Job
Cross-platform builds:
- **macOS**: `aarch64-apple-darwin` (ARM64) + `x86_64-apple-darwin` (Intel)
- **Linux**: Ubuntu 22.04
- **Windows**: Windows Latest

**Apple Signing**: Skips notarization when credentials not provided (uses ad-hoc signing automatically).

## Environment Variables

### Required Variables

Copy `.env.example` to `.env` and provide your API keys:

```bash
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Anthropic API (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Workflow

### Development Workflow

1. **Make changes** → Edit source files
2. **Stage changes** → `git add`
3. **Pre-commit auto-checks** → Husky runs `lint-staged` (fast, only changed files)
4. **Commit** → Code is checked and formatted
5. **Pre-push verification** → Husky runs `check:all` (full validation)
6. **Push** → Code reaches remote
7. **CI validation** → GitHub Actions run all checks and builds

### Common Commands

#### Before Committing
```bash
# Auto-fix and format all changed files
npm run fix:all

# Verify all quality gates pass
npm run check:all
```

#### Before Pushing
```bash
# Always run full check before pushing
npm run check:all
```

### Troubleshooting

**Linting errors**:
- Run `npm run lint:fix` to auto-fix ESLint issues
- Run `npm run lint:rust` to see Clippy warnings

**Formatting issues**:
- Run `npm run format` to fix Prettier issues
- Run `npm run format:rust` to fix Rust formatting

**Type errors**:
- Check `tsc --noEmit` output for type issues
- Ensure all imports are correct

**Hook failures**:
- If pre-commit fails: Run `npm run fix:all` and try again
- If pre-push fails: Run `npm run check:all` and fix any issues

## Quality Standards

This project follows these quality standards:

- **Type Safety**: Strict TypeScript + Rust type checking
- **Code Style**: Prettier + rustfmt enforced
- **Linting**: ESLint + Clippy with warnings as errors
- **Git Hygiene**: Automatic formatting/linting on every commit
- **CI/CD**: Automated validation on every push

All changes must pass these quality gates before being merged.
