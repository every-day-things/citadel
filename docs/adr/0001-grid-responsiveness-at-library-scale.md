# 1. Grid responsiveness at library scale

Status: Accepted — 2026-06-12

## Context

The library grid must feel instant at 5,000 books, not the few dozen it was
first tuned for. Two things broke that at scale: the grid rendered
full-resolution Calibre covers (often 1200×1800, multi-megabyte JPEGs) into
~150px cells, decoding them on the main thread during scroll — producing
half-painted covers and visible jank — and a search blanked the whole grid to
a spinner on every keystroke.

## Decision

Render the grid from a per-library cache of downscaled (300px) cover
thumbnails. Each thumbnail's pixel dimensions are stored alongside it and used
to size its grid row exactly, so a row mounting during scroll measures to its
estimate instead of shifting the shelf a frame. Full-resolution covers are
kept only for the detail and edit views. Book records page in lazily (the
viewport plus one page of prefetch padding on each edge); a search keeps the
previous results on screen while the next query loads (stale-while-revalidate)
rather than blanking.

## What we rejected

- **Keep rendering full-resolution covers, lazily** — the status quo. This is
  the decode cost we were eliminating; no caching layer on top removes the
  main-thread decode of multi-megabyte images during scroll.
- **A canvas-drawn shelf, or JS-owned scrolling** (intercepting wheel events
  and driving the shelf with transforms). Either would fully eliminate the
  residual compositor flash below, but each means reimplementing hit-testing,
  hover, selection, context menus, and accessibility by hand — and JS scroll
  additionally means hand-rolling momentum and rubber-banding. Judged
  disproportionate to the artifact they remove.
- **An eager, open-time sweep that prefetches every page** of the current
  filter, plus a re-sweep after every mutation. Built and measured: ~2.8s of
  background queries and a standing "the cache is always complete" invariant,
  bought to save ~60ms of placeholder cells on a scrollbar yank into
  never-visited territory. Reverted in favour of lazy paging plus one-page
  prefetch padding. **A maintainer who sees brief placeholder cells on a
  violent yank should not re-introduce this** — the trade was measured and
  rejected.
- **Thumbhash blur-up placeholders.** Prototyped (a ~25-byte hash per cover,
  decoded to a blurred stand-in painted under the loading image) and removed.
  Measured on the local backend, the blur is never visible: a 300px thumbnail
  on local disk decodes by the time its cell mounts, so covers arrive already
  sharp, and the only residual gap is the cell-less frame while the virtualizer
  mounts rows — which a blur living inside cells cannot fill. Thumbhash is a
  network-latency tool: it earns its keep over a remote backend, where the
  ~25-byte hash arrives with the row metadata while the cover image is still in
  flight. Citadel is built around a backend-agnostic `Library` interface with a
  local and an in-progress remote implementation, so this is a real future use
  — but carrying a dormant blur subsystem for a backend that does not exist yet
  is speculative complexity. **Add it back when the remote backend can serve
  hashes on the book-query payload, not before.**

## Consequences

- **Accepted: a 1–3 frame compositor flash on a violent scrollbar yank.**
  WKWebView scrolls asynchronously — the UI process moves the scroll offset
  independently of the web process rasterizing tiles — so a fast enough jump
  can present unpainted background for ~10–30ms before tiles appear. This is
  inherent to native-webview scrolling and cannot be closed from JavaScript.
  Once cells mount their thumbnails are already decoded, so recovery is a
  frame or two. **Revisit if there is new evidence that we can avoid these
  empty paints.**
- A per-library cover-thumbnail cache now lives in the app cache directory
  (tens of MB at 5k books, OS-reclaimable), generated in the background on
  first sight of each cover and kept fresh transparently.
- The grid depends on the thumbnail index loading at library open: the stored
  cover dimensions feed exact row heights, removing the measure-then-shift on
  row mount.
