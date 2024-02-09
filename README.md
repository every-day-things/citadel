# Citadel

Manage your ebook library with Citadel. Backwards compatible with Calibre.

https://github.com/every-day-things/citadel/assets/17505728/84a0c9dd-f14e-411a-8947-1d599f3ad85a

**[Live Demo](https://citadel-demo.everydaythings.software/)** — use an online read-only example library to try out Citadel before installing. The web UI is slightly different from the desktop UI, and not all features work. All books are copyright free and available courtesy of Standard Ebooks.

**Citadel is very early software, and as such is full of bugs and lacking features.**

## Project goals

- **Backwards compatible with Calibre**: Calibre must be able to read any library that Citadel has edited.
- **Good UX**: Citadel must be easy to use and look good.
- **Performant**: Citadel must feel much faster than Calibre, and never slower.

### Non-goals

- **Ebook reader**: Citadel is not an ebook reader. There are many other tools that do a much better job than we could do.
- **...or editor**: If you're editing ebook _content_ (not metadata like titles), Citadel will not be a replacement for you.
- **100% feature parity**: Primarily around Plugins, but there are some advanced features of Calibre we'll likely never build.

## Downloading

> [!WARNING]
> Citadel is _very_ early in development. It will crash. A lot. It may corrupt your ebook library.
>
> **Back up your Calibre library regularly if you use Citadel on it.**

Citadel builds are available from [GitHub actions](https://github.com/every-day-things/citadel/actions/runs/7536243753).
There is no guarantee these builds work.

## Developing

As a prerequisite, you'll need to install [Bun](https://bun.sh), Node[^1], and [Rust](https://www.rust-lang.org/tools/install).

Then, you can install the packages.

```fish
bun install
```

and start up the app like so:

```
bun run dev
# or just bun dev
```

### App preview without backend

You can run just the frontend with this command, although you WILL see errors as the Rust backend will be missing but is assumed to exist:

```fish
bun dev:app
```

To run the backend in server mode for development, run
```fish
bun dev -- -- -- -- --server --calibre-library=/path/to/calibre/library
```

Yes, that is 4 pairs of `--`s. This is because Bun will pass the first pair to another bun run command, the second will go to tauri dev, the third will go to vite dev, and finally the last set will go to Cargo when running the backend. It's a mess!

To run the backend in server mode for production, run
```fish
/Applications/Citadel.app/Contents/MacOS/Citadel --server --calibre-library=/path/to/calibre/library
```

### Setting up Svelte Intellisense

If you want to use an LSP with your editor that is _not_ VS Code (e.g. Helix),
you'll need to globally install
[svelte-language-server](https://github.com/sveltejs/language-tools/tree/master/packages/language-server).

Using Bun, that looks like `bun add -g svelte-language-server`. With that, the
project should be ready to go.

## Building

To create a production version of Citadel, you'll need the development prereqs. Then:

```bash
bun install
bun run build
```

## Additional Credit

Huge thanks to [Kemie Guaida](https://kemielikes.design/), who created an excellent [Calibre redesign Figma prototype](https://old.reddit.com/r/Calibre/comments/udzumn/testing_a_new_interface_for_calibre/). Thank you, Kemie!

[^1]: https://github.com/every-day-things/citadel/issues/9
