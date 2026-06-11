# Design

Citadel's visual system. Tokens live in `src/styles.css` (`--ctd-*`, light +
dark via `data-mantine-color-scheme`); the Mantine theme is `src/lib/theme.ts`.

## Direction

Native macOS materials. The chrome is neutral and recedes; book covers are the
only saturated decoration. Reference lineage: Things, Bear, NetNewsWire, Apple
Books. Anti-reference: Calibre's cluttered chrome, generic web-app SaaS.

## Color

- All chrome colors in OKLCH, near-neutral, never pure black/white.
  - Light: warm-paper whisper, hue 80, chroma 0.001–0.008.
  - Dark: cool graphite, hue 260, chroma 0.003–0.005.
- Strategy: Restrained. One accent — macOS-blue `--ctd-accent`
  (oklch 58%/0.17/255 light, 66%/0.15/255 dark) — used only for primary
  actions, current selection, links, and state. Never decoration.
- Danger is macOS-red territory (hue 27).
- Layering: `--ctd-bg` (window) → `--ctd-surface*` (content) → controls.
  Sidebar/toolbar use `--ctd-nav-bg`/`--ctd-header-bg` with hairline
  `--ctd-border` separators. No gradients in chrome.
- Book-cover faces (`BookCover.tsx` placeholder art) are content: the serif
  type and spine-shading gradients there are intentional and stay.

## Typography

- System stack everywhere: `-apple-system, BlinkMacSystemFont, "SF Pro Text"…`.
  Headings same family at 600. No display/serif fonts in UI chrome.
- Root size 14px (desktop density). Sidebar section headers: `size="xs"`,
  600, uppercase, 0.05em tracking, `--ctd-ink-soft`.
- Page titles are modest (`Title order={3}`), toolbar-scale, not hero-scale.

## Layout

- Flush panels, not cards: sidebar and content separated by 1px
  `--ctd-border` rules. No rounded inset containers around primary content
  (the book grid and page headers sit directly on the window).
- Buttons: filled accent only for the primary action of a form/dialog;
  `variant="default"` (neutral bordered) for everything else. Buttons that
  open a dialog end with an ellipsis ("Add Book…").
- Shadows are reserved for overlays (menus, modals, drawers) and book covers.

## Motion

- 140–200ms, ease-out, state changes only. `prefers-reduced-motion` is
  honored globally in styles.css. No hover lifts or decorative transitions.

## Accessibility

- WCAG AA: `--ctd-ink-soft` is tuned to stay ≥4.5:1 on `--ctd-bg`; keep it
  that way when adjusting. UI components ≥3:1 against adjacent colors.
- Don't communicate state by color alone (read/unread also uses position or
  iconography).
