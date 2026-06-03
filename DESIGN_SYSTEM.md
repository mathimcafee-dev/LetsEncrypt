# SSLVault — Warm Stone Design System v1.0
**Status: LOCKED PRODUCTION — Approved 2026-06-03**

Do not modify colours, fonts, or spacing without explicit approval from Spartan.

---

## Colour Palette

| Token | Value | Usage |
|-------|-------|-------|
| Page background | `#f4f1ec` | Every page background |
| Surface / card | `#ffffff` | All cards, panels, modals |
| Surface alt | `#f0ede7` | Toolbars, section alternates |
| Surface deep | `#e8e4dd` | Pressed states |
| Ink primary | `#111111` | Headings, primary text |
| Ink secondary | `#444444` | Body text |
| Ink tertiary | `#888888` | Labels, muted text |
| Ink faint | `#aaaaaa` | Placeholders |
| Teal (brand) | `#1f5c4e` | Primary CTAs, active states, accent |
| Teal hover | `#2e7a68` | Button hover |
| Green | `#16a068` | Live / healthy / success |
| Amber | `#9a6400` | Warning / expiring |
| Red | `#c0392b` | Error / expired / danger |
| Border default | `rgba(0,0,0,0.08)` | Card edges, dividers |
| Border strong | `rgba(0,0,0,0.13)` | Input edges |

### Intentional dark surfaces (do NOT convert)
| Surface | Value | Where |
|---------|-------|-------|
| Score hero banner | `#111111` | Dashboard posture card |
| Code/terminal blocks | `#111111` | Command display, mock terminals |
| Landing footer | `#111111` | Home page footer |

---

## Typography

| Role | Font | Weight |
|------|------|--------|
| UI / body | Inter | 400, 500, 600, 700 |
| Monospace / code | JetBrains Mono | 400, 500 |

---

## Spacing & Radius

| Token | Value |
|-------|-------|
| `--ws-r-sm` | `5px` — tags, chips |
| `--ws-r-md` | `8px` — buttons, inputs |
| `--ws-r-lg` | `12px` — cards |
| `--ws-r-xl` | `16px` — panels, modals |

---

## CSS Variables (src/styles/warm-stone.css)

All tokens are defined as CSS custom properties under `:root`.
All pages import via `src/index.css` → `@import './styles/warm-stone.css'`.

---

## Rules

1. Never use `rgba(240,237,232,x)` cream as text colour on light backgrounds.
2. Never use `rgba(255,255,255,x)` as border on light backgrounds.
3. Never use dark red gradients (`#8b0000`, `#5c0000` etc.) as page/section backgrounds.
4. All buttons: `border-radius: 7–10px`, `font-weight: 600–700`.
5. All modals: white `#ffffff` card, `rgba(0,0,0,0.45)` overlay.
6. All nav headers (public pages): `#ffffff` background, `boxShadow: 0 1px 0 rgba(0,0,0,0.05)`.
7. Domain names in tables: `color: #111111`, `font-family: JetBrains Mono`.
8. Section alternation (landing): `#f4f1ec` → `#ffffff` → `#f4f1ec` → `#ffffff`.
