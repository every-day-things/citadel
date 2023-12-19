# Citadel

Manage your ebook library with Citadel.

## Developing

As a prerequisite, you'll need to install [Bun](https://bun.sh).

```fish
bun install

bun tauri dev
```

To view the app without Tauri, which will have errors as the Rust backend is missing, run:

```fish
bun dev
```

## Building

To create a production version of Citadel:

```bash
bun tauri build
```
