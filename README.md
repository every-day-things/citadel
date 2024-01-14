# Citadel

Manage your ebook library with Citadel. Backwards compatible with Calibre.

https://github.com/every-day-things/citadel/assets/17505728/84a0c9dd-f14e-411a-8947-1d599f3ad85a


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

To run the backend in server mode for development, run 
```fish
bun dev -- -- -- -- --server --calibre-library=/path/to/calibre/library
```

Yes, that is 4 pairs of `--`s. This is because Bun will pass the first pair to another bun run command, the second will go to tauri dev, the third will go to vite dev, and finally the last set will go to Cargo when running the backend. It's a mess!

To run the backend in server mode for production, run
```fish
/Applications/Citadel.app/Contents/MacOS/Citadel --server --calibre-library=/path/to/calibre/library
```

## Building

To create a production version of Citadel:

```bash
bun run build
```

## Additional Credit

Huge thanks to [Kemie Guaida](https://kemielikes.design/), who created an excellent [Calibre redesign Figma prototype](https://old.reddit.com/r/Calibre/comments/udzumn/testing_a_new_interface_for_calibre/). Thank you, Kemie!
