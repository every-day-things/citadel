# Citadel docs

Citadel is a Tauri app that uses Svelte for the UI and Rust for the backend.

Tauri uses native WebViews to render the UI, which is why the app is so small.
It also means that not all users will see the same UI, as it depends on the
browser engine installed on the user's system.

## Overview

There are two ways to use Citadel: bundled in one app or as a headless server & web app.
The headless server is still in progress, so we'll focus on the bundled app.

<figure>
  <img src="./assets/images/arch-overview.png" alt="Diagram showing that the UI has a Calibre client that uses IPC to talk to the backend's calibre adapter, which calls out to libcalibre. Space is left open to demonstrate that other clients and adapters are possible." /
  <figcaption>Overview of how the UI talks to <code>libcalibre</code>.</figcaption>
</figure>

The bundled app has a Svelte frontend that uses interprocess communication (IPC) to send async commands to the backend.
The frontend has a `Library` that can be initialized to use different kind of library types.
For now, the only option is either local or remote Calibre libraries.

Local calibre libraries are called through IPC, and all that _Citadel_ does is
translate commands and call `libcalibre`, which is the core library that handles
all the logic related to Calibre.

## Principles

As little logic business logic is written in the front end as possible, excluding UI logic.

Where possible, we look to composability and modularity.
All logic related to Calibre, for instance, is in a `libcalibre` crate that can be used in other projects.

Modules are deep, and errors are defined out of existence. For more, see
[A Philosophy of Software Design](https://openlibrary.org/books/OL28736729M/A_Philosophy_of_Software_Design).
