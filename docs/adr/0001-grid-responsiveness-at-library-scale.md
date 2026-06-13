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
thumbnails, each carrying a [thumbhash](https://evanw.github.io/thumbhash/)
placeholder and its exact pixel dimensions. A cell paints the thumbhash blur
the instant its row mounts, swaps in the small thumbnail as it decodes, and
uses the stored dimensions to size its row exactly (no measure-then-shift).
Full-resolution covers are kept only for the detail and edit views. Book
records page in lazily (the viewport plus one page of prefetch padding on each
edge); a search keeps the previous results on screen while the next query
loads (stale-while-revalidate) rather than blanking.

## Why thumbhash, when covers are local files today

On the local Calibre backend a 300px thumbnail is read from disk and decoded
in milliseconds, so the blur placeholder it shows beneath is, on its own,
marginal — it covers only the brief window where a burst of cells mount during
a fast scroll before their images decode.

The justification is architectural, not local. Citadel is built around one
backend-agnostic `Library` interface with both a local and a (in-progress)
remote implementation; the cover-render path does not know or care which
backend produced a cover. Over a remote backend the cover image carries
network latency while the ~25-byte thumbhash arrives with the row metadata —
which is exactly the case thumbhash exists for. Building it into the local
path now means the render path is already correct for remote: only the server
side (generating and serving hashes, ideally on the book-query payload) is
left to add. We are deliberately keeping the render path backend-agnostic
rather than optimising it for the local-only case we ship today.

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

## Consequences

- **Accepted: a 1–3 frame compositor flash on a violent scrollbar yank.**
  WKWebView scrolls asynchronously — the UI process moves the scroll offset
  independently of the web process rasterizing tiles — so a fast enough jump
  can present unpainted background for ~10–30ms before tiles (and the thumbhash
  blur beneath them) appear. This is inherent to native-webview scrolling and
  cannot be closed from JavaScript. Thumbhash placeholders make recovery
  near-instant. **Revisit if there is new evidence that we can avoid these
  empty paints.**
- A per-library cover-thumbnail cache now lives in the app cache directory
  (~80 MB at 5k books, OS-reclaimable), generated in the background on first
  sight of each cover and kept fresh transparently.
- The cover-render path (thumbhash blur + thumbnail swap) is backend-agnostic
  and ready for the remote backend; the local path is its first consumer.
- The grid depends on the thumbnail index loading at library open: the stored
  cover dimensions feed exact row heights, so the same data that drives the
  blur placeholders also removes scroll-measurement shift.
