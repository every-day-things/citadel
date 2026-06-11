# Product

## Register

product

## Users

People who already keep a curated ebook library in Calibre and are tired of
fighting its UI. They're on a Mac (primary platform), often managing hundreds
of books in focused sessions: importing a new purchase, fixing metadata,
finding the next read. They know what a good Mac app feels like and notice
when something doesn't.

## Product Purpose

Citadel is a local-first ebook library manager, backwards compatible with
Calibre's library format. It exists because Calibre is powerful but feels like
a 2005 power tool. Success: a Calibre user opens Citadel, finds their library
intact, and everything they do feels faster and calmer than it did before.
Citadel is not a reader and not an ebook editor; it manages the library and
hands files to other apps.

## Brand Personality

Quiet, native, exact. The app recedes; book covers are the only decoration
that matters. Emotionally it should feel like a well-kept private library:
calm and orderly, never busy. Mac-native craft in the lineage of Things, Bear,
and NetNewsWire, with the responsiveness and keyboard-friendliness of Linear
and Raycast. When in doubt, follow the macOS Human Interface Guidelines.

## Anti-references

- **Calibre itself**: cluttered toolbars, dated widgets, twelve buttons where
  one menu would do.
- **Generic AI-built SaaS**: identical card grids, gradient accents, hero
  metrics, web-app chrome inside a desktop window.
- **Electron-app sameness**: web typography and spacing that ignores the
  platform; controls that are visibly not at home on macOS.

## Design Principles

1. **Covers are the color.** The chrome stays neutral; book covers provide all
   the visual richness. Never compete with the content.
2. **Native before novel.** Reach for the macOS idiom first (source list
   sidebar, toolbar, standard control sizes). Invent only when the idiom
   genuinely doesn't fit.
3. **Fast is a feature.** Every interaction should feel instant; perceived
   performance beats decorative motion. Honor the project goal: never slower
   than Calibre.
4. **Calm density.** Show many books without feeling crowded: tight, regular
   rhythm over big airy cards.
5. **Trustworthy with data.** The UI never hides what will be written to the
   Calibre library; destructive or lossy actions are explicit.

## Accessibility & Inclusion

WCAG AA: 4.5:1 for body text, 3:1 for UI components and large text. Honor
`prefers-reduced-motion`. Full keyboard operability for the core flows
(browse, search, edit metadata). Don't rely on color alone to communicate
state (e.g. read/unread).
