# Noverlink Design System

> **Version:** 4.0 — Evangelion Title Card Style
> **Last Updated:** 2025-01-03
> **Status:** Active
> **Reference:** `/dev/evangelion`

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Specifications](#component-specifications)
6. [Effects & Overlays](#effects--overlays)
7. [Animation Guidelines](#animation-guidelines)
8. [Accessibility](#accessibility)
9. [Do's and Don'ts](#dos-and-donts)
10. [Quick Reference](#quick-reference)

---

## Design Philosophy

### Core Concept: EVA Title Card Aesthetic

Inspired by the classic title card design from *Neon Genesis Evangelion* — **Minimal, Impact, Bold**.

Present technical information in a "big headline" style, making every screen feel like an important announcement.

### Style Keywords

| Keyword | Description |
|---------|-------------|
| **Stark** | Deep gray background + pure white text, high contrast but comfortable |
| **Compressed** | Text mechanically compressed, creating visual tension |
| **Minimal** | Generous whitespace, only essential information |
| **Cinematic** | Like watching anime title sequences |

### Three Design Pillars

#### 1. Title Card Hierarchy

- **Headline First:** Important information uses oversized compressed text
- **Episode Format:** Numbering like `TUNNEL.01`, `STATUS.00`
- **Less is More:** Each screen conveys one core message

#### 2. Mechanical Compression

- **scaleY(0.7) + scaleX(0.85)** — Core visual feature
- Mimics the tightness of Matisse EB Mincho typeface
- Creates a sense of "pressure" and "tension"

#### 3. Film Aesthetic

- Subtle grain noise
- Faint screen flicker
- Status indicator glow effects
- Overall CRT monitor feel

### Design References

- **Neon Genesis Evangelion** — Title cards, NERV interface
- **Fontworks Matisse EB** — Compressed Mincho typeface
- **2001: A Space Odyssey** — HAL 9000 interface

---

## Color System

### Primary Palette — Deep Dark

Minimal black/white/gray, with color only for status indicators.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0a0a0a` | Main background (deep gray, not pure black) |
| `--color-bg-elevated` | `#111111` | Navigation, hover states |
| `--color-bg-card` | `#0a0a0a` | Card background |
| `--color-surface` | `#141414` | Elevated surface |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#FFFFFF` | Main titles, important content |
| `--text-secondary` | `rgba(255,255,255,0.8)` | Secondary content |
| `--text-muted` | `rgba(255,255,255,0.75)` | Labels, descriptions (WCAG AA compliant) |
| `--text-subtle` | `rgba(255,255,255,0.4)` | Placeholders, hints |

### Status Colors (Semantic Colors)

Only status indicators use color, with glow effects.

| State | Hex | Usage |
|-------|-----|-------|
| **Connected / Success** | `#00FF00` | Connected, healthy, success |
| **Warning / Idle** | `#FFB800` | Warning, idle, high latency |
| **Error / Disconnected** | `#FF0000` | Disconnected, error, failure |

**Status color variables:**
```css
:root {
  --status-success: #00FF00;
  --status-warning: #FFB800;
  --status-error: #FF0000;
}
```

**Glow effect:**
```css
/* Status glow */
.status-connected {
  color: var(--status-success);
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
}

.status-warning {
  color: var(--status-warning);
  text-shadow: 0 0 10px rgba(255, 184, 0, 0.5);
}

.status-error {
  color: var(--status-error);
  text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
}
```

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--border-default` | `rgba(255,255,255,0.15)` | Dividers, card borders |
| `--border-status` | `currentColor` | Status indicator borders (matches status color) |

### Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-base` | `1` | Base content |
| `--z-overlay` | `10` | Overlays |
| `--z-modal` | `50` | Modals |
| `--z-toast` | `100` | Toast notifications |
| `--z-grain` | `9999` | Grain overlay |

---

## Typography

### Font Stack

```css
/* Title font - compressed serif */
--font-title: 'Times New Roman', 'Georgia',
              'Noto Serif CJK TC', 'Source Han Serif TC', serif;

/* Subtitle/UI - Swiss sans-serif */
--font-ui: 'Helvetica Neue', 'Arial', -apple-system, sans-serif;

/* Monospace - technical data */
--font-mono: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
```

### The Compression Transform

**This is the core of the entire design system!**

```css
.eva-title {
  font-family: var(--font-title);
  font-weight: 900;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1;

  /* Key: mechanical compression */
  transform: scaleY(0.7) scaleX(0.85);

  /* Subtle glow for readability */
  text-shadow: 0 0 60px rgba(255,255,255,0.2);
}
```

### Type Scale

| Name | Size | Weight | Transform | Usage |
|------|------|--------|-----------|-------|
| `display` | clamp(4rem, 15vw, 12rem) | 900 | compressed | Full-screen title card |
| `title` | clamp(4rem, 10vw, 8rem) | 900 | compressed | Page main title |
| `heading-1` | clamp(2.5rem, 6vw, 5rem) | 900 | compressed | Section large title |
| `heading-2` | clamp(1.5rem, 4vw, 3rem) | 900 | compressed | Section title |
| `ui-label` | 0.8rem | 400 | none | UI labels |
| `ui-small` | 0.7rem | 400 | none | Small UI text |
| `mono` | 0.9rem | 400 | none | Technical data |

### UI Text Style

Subtitles and interface text use sans-serif font with wide letter-spacing.

```css
.eva-ui-text {
  font-family: var(--font-ui);
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.6);
}
```

### Typography Examples

```tsx
// Display - Full-screen title card
<h1 style={{
  fontFamily: "'Times New Roman', Georgia, serif",
  fontWeight: 900,
  fontSize: 'clamp(4rem, 15vw, 12rem)',
  color: '#fff',
  transform: 'scaleY(0.7) scaleX(0.85)',
  textShadow: '0 0 60px rgba(255,255,255,0.2)',
}}>
  NOVERLINK
</h1>

// Episode Header - Episode title
<div style={{ borderLeft: '4px solid #00FF00', padding: '30px 40px' }}>
  <span style={{ fontWeight: 900, transform: 'scaleY(0.75) scaleX(0.9)' }}>
    TUNNEL<span style={{ color: '#00FF00' }}>.01</span>
  </span>
</div>

// UI Label - Interface label
<span style={{
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  fontSize: '0.8rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.75)',
}}>
  ACTIVE TUNNELS
</span>

// Mono - Technical data
<code style={{
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  color: 'rgba(255,255,255,0.8)',
}}>
  localhost:3000
</code>
```

---

## Spacing & Layout

### Minimal Composition

EVA style emphasizes generous whitespace and centered composition.

```tsx
// Full-screen title card
<div style={{
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#0a0a0a',
}}>
  <h1 className="eva-title">TUNNEL ACTIVE</h1>
</div>
```

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `--bp-mobile` | `375px` | Mobile devices |
| `--bp-tablet` | `768px` | Tablet devices |
| `--bp-desktop` | `1024px` | Desktop |
| `--bp-wide` | `1440px` | Wide screens |

### Padding Standards

| Element | Padding |
|---------|---------|
| Title card section | `80px 40px` |
| Content section | `40px` |
| List item | `20px 40px` |
| Status badge | `4px 12px` |
| Button | `12px 24px` |

### Border Standards

| Usage | Style |
|------|-------|
| Divider | `1px solid rgba(255,255,255,0.15)` |
| Status border (left) | `4px solid [status-color]` |
| Status badge | `1px solid [status-color]` |

---

## Component Specifications

### 1. Title Card

Full-screen impactful title display.

```tsx
function TitleCard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      padding: '80px 40px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
    }}>
      <h1 style={{
        fontFamily: "'Times New Roman', Georgia, serif",
        fontWeight: 900,
        fontSize: 'clamp(4rem, 10vw, 8rem)',
        color: '#fff',
        textTransform: 'uppercase',
        transform: 'scaleY(0.7) scaleX(0.85)',
        textShadow: '0 0 40px rgba(255,255,255,0.1)',
        margin: 0,
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: '0.9rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
          marginTop: '30px',
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
```

### 2. Episode Header

`TUNNEL.01` format title.

```tsx
function EpisodeHeader({
  label,
  number,
  title,
  status = 'connected',
}: {
  label: string;
  number: string;
  title?: string;
  status?: 'connected' | 'warning' | 'error';
}) {
  const statusColors = {
    connected: 'var(--status-success)',
    warning: 'var(--status-warning)',
    error: 'var(--status-error)',
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      borderLeft: `4px solid ${statusColors[status]}`,
      padding: '30px 40px',
    }}>
      <div style={{
        fontFamily: "'Times New Roman', Georgia, serif",
        fontWeight: 900,
        fontSize: '2rem',
        color: '#fff',
        transform: 'scaleY(0.75) scaleX(0.9)',
        transformOrigin: 'left',
      }}>
        {label}<span style={{ color: statusColors[status] }}>.{number}</span>
      </div>
      {title && (
        <p style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: '0.8rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.75)',
          marginTop: '10px',
        }}>
          {title}
        </p>
      )}
    </div>
  );
}
```

### 3. Status Row

Simple label + value format.

```tsx
function StatusRow({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning';
}) {
  const colors = {
    default: '#fff',
    success: 'var(--status-success)',
    warning: 'var(--status-warning)',
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      padding: '20px 40px',
      borderBottom: '1px solid rgba(255,255,255,0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: '0.8rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.75)',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Times New Roman', Georgia, serif",
        fontWeight: 900,
        fontSize: '1.5rem',
        color: colors[variant],
        transform: 'scaleY(0.8) scaleX(0.9)',
      }}>
        {value}
      </span>
    </div>
  );
}
```

### 4. Tunnel Card

```tsx
function TunnelCard({
  id,
  name,
  port,
  url,
  status,
}: {
  id: string;
  name: string;
  port: number;
  url?: string;
  status: 'connected' | 'disconnected' | 'idle';
}) {
  const statusColors = {
    connected: 'var(--status-success)',
    disconnected: 'var(--status-error)',
    idle: 'var(--status-warning)',
  };

  return (
    <div style={{
      backgroundColor: '#0a0a0a',
      borderLeft: `4px solid ${statusColors[status]}`,
      padding: '30px 40px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: "'Times New Roman', Georgia, serif",
            fontWeight: 900,
            fontSize: '2rem',
            color: '#fff',
            transform: 'scaleY(0.75) scaleX(0.9)',
            transformOrigin: 'left',
          }}>
            UNIT-{id}
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: '0.8rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.75)',
            marginTop: '10px',
          }}>
            {name}
          </div>
        </div>
        <span style={{
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: statusColors[status],
          padding: '4px 12px',
          border: `1px solid ${statusColors[status]}`,
          textShadow: `0 0 10px ${statusColors[status]}`,
          alignSelf: 'flex-start',
        }}>
          {status}
        </span>
      </div>
      <div style={{
        marginTop: '20px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: 'rgba(255,255,255,0.8)',
      }}>
        <div>localhost:{port}</div>
        {url && (
          <div style={{ color: statusColors[status], marginTop: '5px' }}>
            → {url}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 5. Navigation

```tsx
function EvaNav({
  items,
  active,
  onSelect,
}: {
  items: string[];
  active: string;
  onSelect: (item: string) => void;
}) {
  return (
    <nav style={{
      backgroundColor: '#111',
      display: 'flex',
      borderBottom: '1px solid rgba(255,255,255,0.15)',
    }}>
      {items.map((item) => (
        <button
          key={item}
          onClick={() => onSelect(item)}
          style={{
            flex: 1,
            padding: '20px',
            minHeight: '44px', // Touch target minimum
            backgroundColor: active === item ? '#fff' : 'transparent',
            color: active === item ? '#000' : '#fff',
            border: 'none',
            fontFamily: "'Helvetica Neue', Arial, sans-serif",
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background-color 200ms, color 200ms',
          }}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}
```

### 6. Terminal Output

```tsx
<div style={{
  backgroundColor: '#0a0a0a',
  padding: '40px',
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  color: '#00FF00',
  lineHeight: 1.8,
  textShadow: '0 0 10px rgba(0,255,0,0.3)',
}}>
  <div style={{ color: 'rgba(255,255,255,0.5)' }}># NOVERLINK SYSTEM v1.0.0</div>
  <div>&gt; Initializing...</div>
  <div>&gt; Connection established</div>
  <div>&gt; Tunnel: api-gateway → api.noverlink.com</div>
  <div>&gt; Status: <span style={{ color: '#00FF00' }}>READY</span></div>
</div>
```

### 7. Button

```tsx
function EvaButton({
  children,
  variant = 'primary',
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      style={{
        padding: '12px 24px',
        minHeight: '44px', // Touch target minimum
        backgroundColor: variant === 'primary' ? '#fff' : 'transparent',
        color: variant === 'primary' ? '#000' : '#fff',
        border: variant === 'secondary' ? '1px solid rgba(255,255,255,0.3)' : 'none',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: '0.75rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 200ms ease',
      }}
    >
      {children}
    </button>
  );
}
```

---

## Effects & Overlays

### Film Grain

Subtle noise effect for film texture.

```tsx
function GrainOverlay() {
  return (
    <div style={{
      position: 'fixed',
      inset: '-50%',
      width: '200%',
      height: '200%',
      pointerEvents: 'none',
      zIndex: 'var(--z-grain)',
      opacity: 0.08,
      background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      animation: 'grain 0.5s steps(10) infinite',
    }} />
  );
}
```

### Grain Animation

```css
@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -10%); }
  20% { transform: translate(-15%, 5%); }
  30% { transform: translate(7%, -25%); }
  40% { transform: translate(-5%, 25%); }
  50% { transform: translate(-15%, 10%); }
  60% { transform: translate(15%, 0%); }
  70% { transform: translate(0%, 15%); }
  80% { transform: translate(3%, 35%); }
  90% { transform: translate(-10%, 10%); }
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .grain-overlay {
    animation: none;
  }
}
```

---

## Animation Guidelines

### Usage Principles

EVA style animations should be **restrained and purposeful**.

| Scenario | Animation | Description |
|----------|-----------|-------------|
| Title reveal | ✅ | Fade in + compression transform |
| State change | ✅ | Quick fade (200ms) |
| Navigation switch | ✅ | Background color transition |
| Background effects | ✅ | Grain movement (subtle) |
| Complex animations | ❌ | Avoid fancy loading animations |

### Title Reveal Animation

```css
@keyframes title-reveal {
  0% {
    opacity: 0;
    transform: scaleY(0.7) scaleX(0.85);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 1;
    transform: scaleY(0.7) scaleX(0.85);
  }
}

.eva-title {
  animation: title-reveal 0.8s ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .eva-title {
    animation: none;
    opacity: 1;
  }
}
```

### Subtitle Reveal

```css
@keyframes subtitle-reveal {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

.eva-subtitle {
  opacity: 0;
  animation: subtitle-reveal 0.5s ease-out 0.5s forwards;
}

@media (prefers-reduced-motion: reduce) {
  .eva-subtitle {
    animation: none;
    opacity: 1;
  }
}
```

### Transition Timing

| Type | Duration | Easing |
|------|----------|--------|
| Micro-interactions | 150-200ms | ease-out |
| State changes | 200ms | ease-out |
| Page transitions | 300ms | ease-in-out |

---

## Accessibility

### Color Contrast

All text must meet WCAG AA standards (4.5:1 minimum for normal text).

| Element | Foreground | Background | Ratio | Pass |
|---------|------------|------------|-------|------|
| Primary text | `#FFFFFF` | `#0a0a0a` | 17:1 | ✅ AAA |
| Secondary text | `rgba(255,255,255,0.8)` | `#0a0a0a` | 13.6:1 | ✅ AAA |
| Muted text | `rgba(255,255,255,0.75)` | `#0a0a0a` | 12.8:1 | ✅ AAA |
| Subtle text | `rgba(255,255,255,0.4)` | `#0a0a0a` | 6.8:1 | ✅ AA |

### Focus States

All interactive elements must have visible focus indicators.

```css
/* Focus visible for keyboard navigation */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible {
  outline: 2px solid var(--status-success);
  outline-offset: 2px;
}

/* Focus for mouse interaction (subtle) */
button:focus {
  outline: 1px solid rgba(255,255,255,0.3);
  outline-offset: 1px;
}
```

### Touch Targets

Minimum 44x44px for all interactive elements.

```css
.button, .nav-item, .clickable {
  min-height: 44px;
  min-width: 44px;
}
```

### Reduced Motion

Respect `prefers-reduced-motion` for all animations.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Readers

- Use semantic HTML (`<nav>`, `<main>`, `<section>`)
- Add `aria-label` to icon-only buttons
- Add `aria-live` for dynamic status updates
- Ensure reading order matches visual order

```tsx
// Icon-only button example
<button aria-label="Create new tunnel">
  <PlusIcon />
</button>

// Live region for status updates
<div aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>
```

---

## Do's and Don'ts

### ✅ DO

1. **Use compression transform** — `scaleY(0.7) scaleX(0.85)` is the core
2. **Generous whitespace** — Let titles breathe
3. **Deep gray background** — `#0a0a0a` not pure black, more comfortable
4. **Status glow** — Color only for status, with glow effect
5. **Wide letter-spacing for UI** — `letter-spacing: 0.2em`
6. **Episode format** — Naming like `TUNNEL.01`
7. **Minimal composition** — One focal point per screen
8. **Monospace for technical data** — ports, URLs, IPs
9. **Focus states** — Visible keyboard navigation
10. **Touch targets** — Minimum 44x44px for interactive elements

### ❌ DON'T

1. **Pure black background** — Too harsh, use `#0a0a0a`
2. **Too many colors** — Only status uses color
3. **Light font weights** — Titles need 900 weight
4. **Uncompressed titles** — Loses the EVA feel
5. **Complex layouts** — Keep it minimal
6. **Rounded corners** — Rarely used, if ever
7. **Excessive grain** — Keep opacity at 0.08
8. **Colorful UI** — This is not PostHog
9. **Emoji as icons** — Use SVG icons instead
10. **Layout shifts on hover** — Use color/opacity transitions only

---

## Quick Reference

### Color Reference

| Usage | Value |
|------|-------|
| Page background | `#0a0a0a` |
| Elevated background | `#111111` |
| Surface | `#141414` |
| Primary text | `#FFFFFF` |
| Secondary text | `rgba(255,255,255,0.8)` |
| Label text | `rgba(255,255,255,0.75)` |
| Hint text | `rgba(255,255,255,0.4)` |
| Divider | `rgba(255,255,255,0.15)` |
| Success/Connected | `#00FF00` |
| Warning/Idle | `#FFB800` |
| Error/Disconnected | `#FF0000` |

### Compression Reference

| Element | Transform |
|---------|-----------|
| Large title | `scaleY(0.7) scaleX(0.85)` |
| Medium title | `scaleY(0.75) scaleX(0.9)` |
| Numbers/Values | `scaleY(0.8) scaleX(0.9)` |
| Body text | No compression |

### Font Reference

| Usage | Font |
|------|------|
| Titles | Times New Roman, Georgia, serif |
| UI text | Helvetica Neue, Arial, sans-serif |
| Technical data | SF Mono, Consolas, monospace |

### Spacing Reference

| Element | Padding |
|---------|---------|
| Title card section | `80px 40px` |
| Content section | `40px` |
| List item | `20px 40px` |
| Status badge | `4px 12px` |
| Button | `12px 24px` |

---

## Implementation Checklist

### Visual Quality
- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Hover states don't cause layout shift
- [ ] Use theme colors directly, not var() wrapper

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected
- [ ] Touch targets minimum 44x44px
- [ ] Color contrast meets WCAG AA (4.5:1)

### Layout
- [ ] Responsive at 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] No content hidden behind fixed elements

---

## NERV Tagline

> *God is in his heaven. All is right with the world.*

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-01-03 | Evangelion Title Card style |
| 3.0 | 2025-01-XX | PostHog-inspired redesign |
| 2.0 | 2025-01-XX | Complete rewrite |
| 1.0 | 2024-XX-XX | Initial version |
