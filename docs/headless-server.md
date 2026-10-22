# Headless OPDS server

`citadel-server` serves one Calibre library over the same OPDS runtime used by
the desktop application. It has no desktop, WebView, or remote management UI.

Copy `crates/citadel-server/example-config.toml`, use absolute paths for the
library, then run:

```sh
CITADEL_OPDS_USERS='["alice:choose-a-password","bob:another-password"]' cargo run -p citadel-server -- \
  --config /absolute/path/to/citadel-server.toml
```

`CITADEL_OPDS_USERS` is a JSON array of `USER:PASSWORD` strings. Split is at
the first colon, so passwords may contain colons. Usernames must be nonempty,
unique (after trimming), and contain no colon; passwords must be nonempty.
Every user has the same read access to the configured library.

Credentials are read from the environment once at startup and held only in
memory. Restart the server to change them. The headless host never loads or
writes credential files and does not load `.env` or secret files. Authentication
enabled with a missing or empty list fails closed. Desktop credential persistence
and password reveal are unchanged.

`stateDirectory` is optional. On Unix it defaults to `$XDG_STATE_HOME/citadel`
when XDG_STATE_HOME is absolute, otherwise `~/.local/state/citadel`. On Windows
it defaults to the local application-data directory's `citadel` subdirectory.
An explicit override must be absolute. The directory is reserved for server
state; this version creates it but writes no files there.

The process logs lifecycle state and every concrete OPDS URL. It remains in the
foreground until SIGINT or SIGTERM, then gracefully closes its listeners.
The localNetworks and allInterfaces targets use the desktop IPv4/IPv6 policy;
allInterfaces requires reader sign-in.

For a reverse proxy on the same host, the target can instead use explicit
concrete addresses without depending on interface discovery:

```toml
[sharing.target.addresses]
addresses = ["127.0.0.1", "::1"]
```

Wildcard, link-local and non-unicast addresses are rejected. Public addresses
require reader sign-in. Configure every
concrete address on which the process should listen.

Citadel serves plain HTTP. For access beyond a trusted local network, place it
behind an externally managed TLS reverse proxy and firewall. Service
supervision, certificates, public-exposure controls, and container or operating
system packages are not provided by this initial server.

## Validation and deployment

Build the host with `cargo build --release -p citadel-server`. This selects the headless package and does not build Tauri. Its configuration uses `sharing.target = "localNetworks"` or `"allInterfaces"`, or the explicit-address table shown above; do not combine those forms.

The Unix process test exercises authentication, catalog navigation, acquisition, and SIGTERM shutdown. The non-Unix Ctrl-C handler requires platform validation; it is not covered by that test. OPDS request limits are described in [Sharing](opds-sharing.md).

To generate a disposable validation library, provide an EPUB you can use for testing:

```sh
cargo run -p libcalibre --example create_opds_validation_library -- \
  /absolute/empty/output-directory /absolute/path/to/example.epub
```

The fixture includes 105 downloadable books, multiple pages, Unicode/XML metadata, assigned genres, missing covers, a large file and a fileless book. It is intended for smoke tests, not for an existing library.

## Shared library HTTP API (foundation)

The optional JSON listener exposes the same `citadel-core` book queries used by
Tauri. It is a foundation for the web client; the existing desktop client still
uses IPC. Add this top-level table to the server config to enable it:

```toml
[api]
listen = "127.0.0.1:8081"
```

Omitting `[api]` leaves the listener disabled. Enable
`sharing.authenticationEnabled` and provide `CITADEL_OPDS_USERS`; the API uses the
same in-memory users and request limits as OPDS. Use TLS at a reverse proxy for
connections beyond a trusted local network. The address must pass the same
explicit-address checks as OPDS. A bind failure fails startup rather than
silently leaving only part of the configured server running.

Initial routes (all require HTTP Basic authentication):

- `POST /api/books/query`: shared `LibraryBookQuery` JSON; HTTP requires an explicit
  `limit` between 0 and 200. Zero returns only the count. Desktop retains its
  existing unbounded-query behavior.
- `GET /api/books/{book_id}`: one book, using the existing numeric string ID.
- `GET /api/openapi.json`: generated OpenAPI 3.1 contract.

Errors have `{ "code": "notFound", "message": "…" }` shape, with HTTP statuses
for invalid input (400), authentication (401), missing books (404), admission
limits (429), unavailable library (503), and internal failures (500). Internal
database/filesystem diagnostics are hidden from remote callers. Responses retain
required nullable fields; request `Option` fields may be omitted or null.

This listener opens the library read-only. File/cover URLs describe the shared
remote DTO shape; the corresponding `/api` asset routes and the complete browser
library adapter are follow-up work. OPDS acquisition routes remain available.
Mutations, uploads, metadata-provider calls, and desktop administration are not
exposed by this API.
