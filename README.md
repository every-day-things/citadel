# Citadel

[![Quality checks](https://github.com/every-day-things/citadel/actions/workflows/quality.yml/badge.svg)](https://github.com/every-day-things/citadel/actions/workflows/quality.yml)
[![Build](https://github.com/every-day-things/citadel/actions/workflows/build.yml/badge.svg)](https://github.com/every-day-things/citadel/actions/workflows/build.yml)
[![](https://dcbadge.limes.pink/api/server/Hh6gRmqBbC?style=flat)](https://discord.gg/Hh6gRmqBbC)

Manage your ebook library with Citadel. Backwards compatible with Calibre.

https://github.com/every-day-things/citadel/assets/17505728/a3879896-8404-4333-98cb-5e1e0060b42e

**Citadel is early software; it is likely full of bugs and lacking features.**

## Project goals

- **Backwards compatible with Calibre**: Calibre must be able to read any library that Citadel has edited.
- **Good UX**: Citadel must be easy to use and look good.
- **Performant**: Citadel must feel much faster than Calibre, and never slower.

### Non-goals

- **Ebook reader**: Citadel is not an ebook reader. There are already excellent ereader apps: Citadel will open your files in your default apps.
- **...or editor**: If you're editing ebook _content_ (not metadata like titles), Citadel will not be a replacement for you.
- **100% feature parity**: Primarily around Plugins, but there are some advanced features of Calibre we'll likely never build.

## Downloading

> [!WARNING]
> Citadel is _very_ early in development. It may crash, or be missing basic features. It may corrupt your ebook library.
>
> **Back up your Calibre library regularly if you use Citadel on it.**

(Semi-) stable builds are available in [Releases](https://github.com/every-day-things/citadel/releases).

Development builds are available from [GitHub actions](https://github.com/every-day-things/citadel/actions/workflows/build.yml).

Please report any issues or crashes you experience while using any version of Citadel!

### Installing on macOS

Builds aren't signed (yet) — if you open Citadel.app directly, you'll get a warning that the file is "damaged".

[Removing the Quarantine attribute from the file](https://superuser.com/questions/526920/how-to-remove-quarantine-from-file-permissions-in-os-x) resolves this. For example,

```fish
xattr -d com.apple.quarantine /Applications/Citadel.app/
```

## Developing

As a prerequisite, you'll need to install [Bun](https://bun.sh), Node[^1], and [Rust](https://www.rust-lang.org/tools/install).

Then, you can install the packages.

```fish
bun install
```

and start up the app like so:

```fish
bun run dev
# or just bun dev
```

### Lint & Formatting

To lint all source code, run `bun lint`. To autoformat, run `bun format`.

| Scope | Action | Command |
| --- | --- | --- |
| All code | Format | `bun format` |
| All code | Format (Check) | `bun format:check` |
| All code | Lint | `bun lint` |
| Backend | Format | `bun format:backend` |
| Backend | Lint | `bun lint:backend` |
| Frontend | Format | `bun format:web` |
| Frontend | Lint | `bun lint:web` |

### App preview without backend

You can run just the frontend with this command, although you WILL see errors as the Rust backend will be missing but is assumed to exist:

```fish
bun dev:app
```

## Building

To create a production version of Citadel, you'll need the development prereqs. Then:

```bash
bun install
bun run build
```

## Additional Credit & Related Projects

This project would not be possible without the north star created by Kovid Goyal,
[Calibre](https://github.com/kovidgoyal/calibre). Without his hard work building
such an extensive and powerful tool, Citadel would not exist.

Huge thanks to [Kemie Guaida](https://kemielikes.design/), who created an
excellent
[Calibre redesign Figma prototype](https://old.reddit.com/r/Calibre/comments/udzumn/testing_a_new_interface_for_calibre/),
from which Citadel takes inspiration.
Thank you, Kemie!

[^1]: https://github.com/every-day-things/citadel/issues/9
