---
name: run-citadel
description: Launch and drive the Citadel Tauri desktop app to verify changes — start the dev build, then drive it headlessly via the embedded WebDriver plugin (DOM queries, clicks, typing, screenshots over plain HTTP), or via Orca computer-use for native-chrome interactions. Use when asked to run the app, verify a UI or backend change end-to-end, screenshot Citadel, or test the desktop app.
---

# Running and driving Citadel (Tauri) for verification

## Launch

```bash
bun run dev   # run with run_in_background: true
```

This runs `tauri dev --config src-tauri/tauri.dev.conf.json`: Vite serves the
frontend at http://localhost:1420, then cargo builds and runs the desktop shell
(`target/debug/citadel-rs`). Incremental Rust rebuild is ~30s; a cold build
takes minutes. The app is up once the output shows
`Running \`/Users/phil/dev/citadel/target/debug/citadel-rs\``.

Hot reload is automatic both ways: frontend edits apply via Vite HMR; edits
under `src-tauri/` or `crates/libcalibre/` trigger a cargo rebuild and app
restart. You usually don't need to relaunch anything after editing code.

## Primary method: embedded WebDriver plugin (fully background)

Debug builds embed `tauri-plugin-webdriver-automation` (registered
debug-only in `src-tauri/src/main.rs`). On launch it starts an HTTP server on a
**dynamic port**, printed in the dev output:

```
[webdriver] listening on port 58367
```

Grab it with: `rg -o 'listening on port \d+' <dev-task-output-file> | tail -1`.
The port changes on every app (re)start, including watcher-triggered Rust
rebuilds — re-check it after any Rust edit.

Everything is plain HTTP POST with JSON (no session handshake needed against
the plugin directly). Verified working 2026-06-11, **including with the window
minimized** — no focus stealing, no foregrounding, no macOS permissions:

```bash
P=58367  # the dynamic port

# Find elements (CSS selectors; also xpath/tag/link text via "using")
curl -s -X POST http://127.0.0.1:$P/element/find -H 'Content-Type: application/json' \
  -d '{"using":"css","value":"a[href=\"/authors\"]"}'

# Click (drives React Router etc. correctly)
curl -s -X POST http://127.0.0.1:$P/element/click -H 'Content-Type: application/json' \
  -d '{"selector":"a[href=\"/authors\"]","index":0}'

# Read state
curl -s -X POST http://127.0.0.1:$P/navigate/current -H 'Content-Type: application/json' -d '{}'
curl -s -X POST http://127.0.0.1:$P/element/text -H 'Content-Type: application/json' \
  -d '{"selector":"h1","index":0}'

# Arbitrary JS in the app's main world (window.__TAURI_INTERNALS__ is visible)
curl -s -X POST http://127.0.0.1:$P/script/execute -H 'Content-Type: application/json' \
  -d '{"script":"return document.body.innerText.match(/Showing[^\\n]*/)[0]","args":[]}'

# Screenshot (base64 PNG; works even minimized). Caveat: this is a WKWebView
# snapshot, not real window pixels — it renders light-scheme regardless of the
# app theme and drops vibrancy/translucent layers (sidebar) and some images.
# Good for layout/DOM-presence checks; for faithful pixels use Orca's
# get-app-state screenshot instead.
curl -s -X POST http://127.0.0.1:$P/screenshot -H 'Content-Type: application/json' -d '{}' \
  | jq -r '.data' | base64 -d > /tmp/shot.png

# Window control: /window/minimize, /window/maximize, /window/set-rect, /window/rect
```

`null` responses mean success. Other useful endpoints: `/element/attribute`,
`/element/property`, `/element/displayed`, `/element/computed-role`,
`/navigate/url|back|forward|refresh`, `/element/active`. Full list:
https://github.com/danielraffel/tauri-webdriver/blob/main/SPEC.md

### Text input into React controlled inputs (IMPORTANT)

Do **NOT** use `/element/send-keys` or `/element/clear` — they write through
React's instrumented value setter, which updates React's internal value tracker
without firing onChange. The value sticks in the DOM but React state never
updates, and worse, it poisons the tracker so later attempts with the same
string are swallowed as no-ops. Use the prototype-setter recipe instead
(verified against the Mantine search field):

```bash
curl -s -X POST http://127.0.0.1:$P/script/execute -H 'Content-Type: application/json' -d '{
  "script": "const el = document.querySelector(arguments[0]); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, \"value\").set; setter.call(el, arguments[1]); el.dispatchEvent(new Event(\"input\", { bubbles: true })); return el.value;",
  "args": ["input[placeholder*=\"Search book\"]", "the text"]
}'
```

Clear a field by passing `""`. Always verify the effect afterward (e.g. the
status-bar book count), not just the field value.

### More gotchas (verified 2026-06-11)

- **Plugin crash**: navigating (`/navigate/url`) while a `script/execute`
  callback is pending can panic the plugin ("no pending script with that id" →
  poisoned lock); every later request then fails (curl exit 52). Recover by
  touching `src-tauri/src/main.rs` so the watcher rebuilds and relaunches the
  app (~40s), then re-read the new port from the dev output.
- **Mantine Menus/popovers do not open from synthetic events** (webdriver
  clicks, AX presses, dispatched PointerEvents all fail). Plain buttons,
  links, inputs, SegmentedControls, and modals work fine. Drive around menus.
- Recording demos: `screencapture -v -l<windowId> -x out.mov` works (window id
  from `orca computer list-windows`); it starts ~7s late, so pad the start and
  use a fresh filename each take (it refuses to overwrite).
- **Config gotchas**: `tauri.dev.conf.json` is merged at *tauri CLI startup*
  only — watcher rebuilds reuse the cached merge, so after editing either conf
  file, kill and restart `bun run dev`. The dev conf's `windows` array replaces
  the base array wholesale (window flags like `titleBarStyle`/`transparent`
  must be duplicated there). Cargo features must match conf allowlists
  (e.g. `macos-private-api` ↔ `app.macOSPrivateApi`) or the build script fails.
- Vibrancy/translucency never shows in WebDriver `/screenshot` *or* when the
  window appearance mismatches: core-plugin calls like `setTheme` need their
  capability (`core:window:allow-set-theme` in capabilities/minimal.json).

### tauri-wd CLI (for WebDriverIO/Selenium suites)

`tauri-wd` (installed at `~/.local/share/cargo/bin/tauri-wd`) exposes a W3C
WebDriver server on :4444 that **launches its own app instance**. Only useful
for real test-runner suites. Never run it while `bun run dev` has the app open —
two instances would fight over the settings store and SQLite library.

## Fallback: Orca computer-use (native chrome, OS-level interaction)

The WebDriver plugin only sees the webview DOM. For native bits — window
traffic lights, native menus/dialogs, drag-and-drop onto the window — use Orca
computer-use. Note it **foregrounds the app** when acting, which the user finds
annoying; prefer the WebDriver plugin whenever the target is in the DOM.

The dev build has no bundle id; it appears as name `citadel-rs`:

```bash
orca computer get-app-state --app citadel-rs --json
```

The accessibility tree lives at `.result.snapshot.treeText` (indexed elements;
there is no `.result.elements`), focus at `.result.snapshot.focusedElementId`,
screenshot at `.result.screenshot.path`. Use the snapshot → act → snapshot
loop; indexes go stale after navigation. `set-value` does not work on React
inputs; click-to-focus (confirm via `focusedElementId`) then
`hotkey CmdOrCtrl+A` / `press-key Delete` / `type-text`. Keys without confirmed
focus land garbled — verify every action in the next snapshot.

### macOS permissions for Orca (known trap, hit and resolved 2026-06-10)

Needs Accessibility + Screen Recording for "Orca Computer Use"
(`orca computer permissions --json`). The check can report `granted` while real
calls fail with `permission_denied`. Fix requires BOTH: toggling the grants in
System Settings → Privacy & Security AND **fully quitting and reopening Orca**
(its runtime caches the denial; restarting the helper alone does not clear it).
Only the user can do this — ask and stop.

## Data: which library the app opens

Dev app identifier is `software.everydaythings.citadel.dev`; settings live at
`~/Library/Application Support/software.everydaythings.citadel.dev/settings.json`.
**Do not print this file — it contains the user's Hardcover API key.** Query it
with jq for specific keys (e.g. `jq '.libraryPaths, .activeLibraryId'`) instead.

- The active dev library is a disposable sample library
  (`/Users/phil/dev/macos-book-app/sample-library`, ~190 books) — fine to read
  and mutate during testing.
- The user's **real** library may also be registered (paths under `~/Seafile`).
  Never switch to it or write to it during testing.
- For a pristine fixture, unzip `src-tauri/resources/empty_7_2_calibre_lib.zip`
  into a temp dir and add it through the UI. `test-library/` at the repo root is
  loose fixture files, not a Calibre library.
- Leave the app tidy when done: clear search filters, navigate back to All
  Books, restore the window if you minimized it.

## Lighter alternatives

- `vitest` (frontend) and `cargo test` (Rust) for unit tests.
- `bun run storybook` (port 6006) for component-level visual checks.
- `bun run dev:web` — frontend only in a plain browser; Tauri IPC is absent and
  most library features break. Rarely useful.
