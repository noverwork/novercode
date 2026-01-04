# Novercode UI Guidelines

> **Version:** 1.0 — Terminal Style
> **Last Updated:** 2025-01-05
> **Status:** Active

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Specifications](#component-specifications)
6. [Effects & Animations](#effects--animations)
7. [Do's and Don'ts](#dos-and-donts)
8. [Quick Reference](#quick-reference)

---

## Design Philosophy

### Core Concept: Terminal Aesthetic

靈感來自工程師每天對著的終端機——**高效、清晰、無裝飾**。

每個元素都像是在 terminal 裡輸出的資訊，簡潔有力。

### 風格關鍵字

| 關鍵字 | 說明 |
|--------|------|
| **Monospace** | 等寬字體，像 terminal 輸出 |
| **High Contrast** | 深黑背景 + 螢光文字 |
| **No Decoration** | 去除所有不必要的裝飾 |
| **Grid-Based** | 像字元格一樣的網格佈局 |

### 三大設計支柱

#### 1. Terminal Colors（終端配色）

- 背景純黑 `#000000`
- 文字使用經典的螢光綠 `#00FF00` 或琥珀色 `#FFB000`
- 可選擇 16 色調色盤

#### 2. Monospace Typography（等寬字體）

- 所有文字使用等寬字體
- 字元格對齊
- 固定行高

#### 3. ASCII Borders（ASCII 邊框）

- 使用 Unicode box-drawing 字元
- `│ ─ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼`
- 或簡單的 `+ - |`

---

## Color System

### Terminal Themes

```bash
# Classic Green（經典綠）
--term-bg: #000000
--term-fg: #00FF00
--term-dim: #008800

# Amber（琥珀色）
--term-bg: #000000
--term-fg: #FFB000
--term-dim: #805800

# Solarized Light（淺色）
--term-bg: #FDF6E3
--term-fg: #657B83
--term-dim: #93A1A1

# Dracula（暗紫）
--term-bg: #1E1F29
--term-fg: #F8F8F2
--term-dim: #6272A4
```

### 16-Color Palette

```bash
# Normal
export color_black="#000000"
export color_red="#CD0000"
export color_green="#00CD00"
export color_yellow="#CDCD00"
export color_blue="#0000EE"
export color_magenta="#CD00CD"
export color_cyan="#00CDCD"
export color_white="#E5E5E5"

# Bright (High Intensity)
export color_bright_black="#7F7F7F"
export color_bright_red="#FF0000"
export color_bright_green="#00FF00"
export color_bright_yellow="#FFFF00"
export color_bright_blue="#5C5CFF"
export color_bright_magenta="#FF00FF"
export color_bright_cyan="#00FFFF"
export color_bright_white="#FFFFFF"
```

### Semantic Colors（語義化顏色）

| 狀態 | 色碼 | 用途 |
|------|------|------|
| **Success** | `#00FF00` | 完成、正常、運行中 |
| **Error** | `#FF0000` | 失敗、錯誤、中斷 |
| **Warning** | `#FFB000` | 警告、待處理 |
| **Info** | `#00CDCD` | 資訊、提示 |
| **Muted** | `#808080` | 停用、次要 |

---

## Typography

### Font Stack

```css
/* Terminal Font - 等寬字體 */
--font-terminal: 'SF Mono', 'Fira Code', 'JetBrains Mono',
                  'Consolas', 'Monaco', 'Courier New', monospace;

/* Fallback for CJK */
--font-terminal-cjk: 'Noto Sans Mono CJK TC', 'SF Mono', monospace;
```

### Type Scale

```css
/* 基於 terminal 行高的字級系統 */
--text-xs:   0.75rem;   /* 12px - status indicators */
--text-sm:   0.875rem;  /* 14px - secondary info */
--text-base: 1rem;      /* 16px - body text */
--text-lg:   1.125rem;  /* 18px - emphasis */
--text-xl:   1.25rem;   /* 20px - headers */
--text-2xl:  1.5rem;    /* 24px - titles */
--text-3xl:  2rem;      /* 32px - main title */
```

### Line Height

```css
/* Terminal 行高 = 1.2 */
--leading-tight:   1.2;
--leading-normal:  1.5;
--leading-relaxed: 1.8;
```

### Font Weight

```css
--font-normal:  400;  /* Regular */
--font-medium:  500;  /* Medium */
--font-bold:    700;  /* Bold */
```

### Typography Classes

```tsx
// Terminal Text
<span className="font-mono text-sm text-green-400">
  $ npm install
</span>

// Header
<h1 className="font-mono text-3xl font-bold text-green-500">
  NOVERCODE
</h1>

// Status Badge
<span className="font-mono text-xs bg-green-900/50 text-green-400 px-2 py-1">
  [ONLINE]
</span>

// Code Block
<pre className="font-mono text-sm bg-black border border-green-900 p-4">
  <code>git commit -m "feat: add terminal theme"</code>
</pre>
```

---

## Spacing & Layout

### Spacing Scale

基於 4px 網格系統：

```css
--spacing-1:  0.25rem;  /* 4px */
--spacing-2:  0.5rem;   /* 8px */
--spacing-3:  0.75rem;  /* 12px */
--spacing-4:  1rem;     /* 16px */
--spacing-5:  1.25rem;  /* 20px */
--spacing-6:  1.5rem;   /* 24px */
--spacing-8:  2rem;     /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
```

### Component Padding

| 元素 | Padding |
|------|---------|
| Button | `0.5rem 1rem` |
| Input | `0.5rem 0.75rem` |
| Card | `1rem` |
| Container | `1rem 1.5rem` |
| Section | `2rem 1.5rem` |

### Border Width

```css
--border-thin:  1px;
--border-medium: 2px;
--border-thick: 4px;
```

### Border Styles

```css
/* Solid */
border: 1px solid var(--color-border);

/* Dashed */
border: 1px dashed var(--color-dim);

/* Double (for emphasis) */
border: 3px double var(--color-fg);
```

---

## Component Specifications

### 1. Terminal Header（終端標題）

```tsx
function TerminalHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-black border-b border-green-900 px-6 py-4">
      <div className="font-mono text-2xl font-bold text-green-500">
        [{title}]
      </div>
      {subtitle && (
        <div className="font-mono text-sm text-green-700 mt-1">
          // {subtitle}
        </div>
      )}
    </div>
  );
}
```

### 2. Status Bar（狀態列）

```tsx
function StatusBar({
  items,
}: {
  items: { label: string; value: string; status?: 'ok' | 'warn' | 'err' }[];
}) {
  const statusColors = {
    ok: 'text-green-500',
    warn: 'text-yellow-500',
    err: 'text-red-500',
  };

  return (
    <div className="bg-black border-t border-green-900 px-4 py-2 flex gap-6">
      {items.map((item) => (
        <div key={item.label} className="font-mono text-sm flex gap-2">
          <span className="text-green-700">{item.label}:</span>
          <span className={statusColors[item.status || 'ok']}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### 3. Terminal Button（終端按鈕）

```tsx
function TerminalButton({
  variant = 'primary',
  children,
  ...props
}: {
  variant?: 'primary' | 'secondary' | 'danger';
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-green-900/30 text-green-500 border-green-700 hover:bg-green-900/50',
    secondary: 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800',
    danger: 'bg-red-900/30 text-red-500 border-red-700 hover:bg-red-900/50',
  };

  return (
    <button
      className={`font-mono text-sm px-4 py-2 border ${styles[variant]}`}
      {...props}
    >
      [{children}]
    </button>
  );
}
```

### 4. Input Field（輸入框）

```tsx
function TerminalInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-xs text-green-700">
        ${label} =
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-mono text-sm bg-black border border-green-900 px-3 py-2 text-green-500 placeholder:text-green-900 focus:outline-none focus:border-green-500"
      />
    </div>
  );
}
```

### 5. Card（卡片）

```tsx
function TerminalCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-black border border-green-900 ${className}`}>
      {title && (
        <div className="border-b border-green-900 px-4 py-2">
          <span className="font-mono text-sm text-green-600">
            /// {title}
          </span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
```

### 6. ASCII Border（ASCII 邊框）

```tsx
function ASCIIBorder({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="font-mono text-sm">
      <div className="text-green-700">
        ┌─{title && ` ${title} `}─┐
      </div>
      <div className="text-green-700 flex">
        <span>│ </span>
        <div className="flex-1 text-green-500">{children}</div>
        <span> │</span>
      </div>
      <div className="text-green-700">└─────────┘</div>
    </div>
  );
}
```

### 7. Task List（任務列表）

```tsx
function TaskList({
  tasks,
}: {
  tasks: { id: string; title: string; status: 'done' | 'pending' }[];
}) {
  return (
    <div className="font-mono text-sm space-y-1">
      {tasks.map((task) => (
        <div key={task.id} className="flex gap-2 text-green-500">
          <span className="text-green-700">
            {task.status === 'done' ? '[x]' : '[ ]'}
          </span>
          <span className={
            task.status === 'done' ? 'text-green-700 line-through' : ''
          }>
            {task.title}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### 8. Kanban Column（看板欄位）

```tsx
function KanbanColumn({
  title,
  tasks,
  stage,
}: {
  title: string;
  tasks: string[];
  stage: string;
}) {
  return (
    <div className="flex flex-col w-72 border border-green-900 bg-black">
      {/* Header */}
      <div className="border-b border-green-900 px-3 py-2 flex justify-between items-center">
        <span className="font-mono text-sm text-green-600">
          &lt;{title}/&gt;
        </span>
        <span className="font-mono text-xs text-green-800">
          [{tasks.length}]
        </span>
      </div>
      {/* Tasks */}
      <div className="p-2 space-y-2 min-h-[400px]">
        {tasks.map((task) => (
          <div
            key={task}
            className="border border-green-900/50 bg-green-950/20 px-3 py-2 font-mono text-sm text-green-500"
          >
            $ {task}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Effects & Animations

### Cursor Blink（光標閃爍）

```css
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.cursor-blink {
  animation: cursor-blink 1s step-end infinite;
}

/* Usage */
<span className="cursor-blink text-green-500">█</span>
```

### Typewriter Effect（打字機效果）

```css
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}

.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid;
  animation:
    typewriter 2s steps(40) forwards,
    cursor-blink 0.5s step-end infinite alternate;
}
```

### Scanline（掃描線）

```tsx
function Scanline() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        background: 'repeating-linear-gradient(0deg, rgba(0, 255, 0, 0.05) 0px, transparent 1px, transparent 2px)',
        backgroundSize: '100% 4px',
      }}
    />
  );
}
```

### CRT Flicker（CRT 閃爍）

```css
@keyframes crt-flicker {
  0% { opacity: 0.97; }
  5% { opacity: 0.99; }
  10% { opacity: 0.98; }
  15% { opacity: 0.96; }
  20% { opacity: 0.98; }
  100% { opacity: 0.97; }
}

.crt-effect {
  animation: crt-flicker 0.15s infinite;
}
```

### Glow Effect（發光效果）

```css
.text-glow {
  text-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
}

.text-glow-strong {
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
}
```

---

## Do's and Don'ts

### ✅ DO

1. **使用等寬字體** — 所有文字都用 monospace
2. **高對比** — 黑底綠字或琥珀色
3. **簡單邊框** — 1px solid 就好
4. **方角設計** — 不用或極少用圓角
5. **ASCII 符號** — 用 `[ ]` `<>` `//` 等符號
6. **小寫為主** — terminal 習慣小寫
7. **狀態明確** — 用顏色區分狀態
8. **網格對齊** — 像字元格一樣對齊

### ❌ DON'T

1. **避免非等寬字體** — 失去 terminal 感
2. **避免過多顏色** — 保持簡單配色
3. **避免花俏動畫** — 只有光標閃爍就好
4. **避免大圓角** — terminal 都是方的
5. **避免陰影** — terminal 沒陰影
6. **避免漸層** — 純色就好
7. **避免過度裝飾** — 極簡優先
8. **避免模糊效果** — 清晰明確

---

## Quick Reference

### 顏色速查

| 用途 | Value |
|------|-------|
| 背景色 | `#000000` |
| 主文字 | `#00FF00` |
| 次要文字 | `#008800` |
| 邊框 | `#004400` |
| 成功 | `#00FF00` |
| 警告 | `#FFB000` |
| 錯誤 | `#FF0000` |

### 字體速查

| 用途 | Font |
|------|------|
| 所有文字 | SF Mono, Fira Code, monospace |
| CJK 支援 | Noto Sans Mono CJK TC |

### 間距速查

| 元素 | Padding |
|------|---------|
| Button | `0.5rem 1rem` |
| Input | `0.5rem 0.75rem` |
| Card | `1rem` |

---

## Quick Start Template

```tsx
// Basic terminal layout
function TerminalLayout() {
  return (
    <div className="min-h-screen bg-black font-mono text-green-500">
      {/* Header */}
      <header className="border-b border-green-900 px-6 py-4">
        <h1 className="text-xl font-bold">[ NOVERCODE ]</h1>
      </header>

      {/* Main */}
      <main className="p-6">
        <p className="text-green-700">// Welcome to novercode terminal</p>
        <p className="mt-2">$ _</p>
      </main>

      {/* Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-green-900 px-4 py-2">
        <span className="text-sm text-green-700">
          [ONLINE] | v1.0.0 | ready
        </span>
      </footer>
    </div>
  );
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-05 | Initial Terminal Style |
