# Citadel

Manage your ebook library with Citadel. Backwards compatible with Calibre.

## Project goals

- **Backwards compatible with Calibre**: Calibre must be able to read any library that Citadel has edited.
- **Good UX**: Citadel should be easy to use and look good.
- **Performant**: Citadel should feel just as fast as Calibre.

### Non-goals

- **E-book reader**: Citadel is not an e-book reader, there are many other tools that do a much better job than we could do.
- **...or editor**: If you're using Calibre's CLI tools to edit your ebooks, open a discussion. Let's see if we can build a better solution.
- **100% feature parity**: Primarily around Plugins, but there are some advanced features of Calibre we'll likely never build.

## Developing

As a prerequisite, you'll need to install [Bun](https://bun.sh).

```fish
bun install

bun run dev
# or just bun dev
```

To view the app without Tauri, which will have errors as the Rust backend is missing, run:

```fish
bun dev:app
```

## Building

To create a production version of Citadel:

```bash
bun run build
```
