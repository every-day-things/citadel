# Shared library operations and HTTP contracts

`citadel-core` owns serializable library contracts, error codes, and synchronous
`LibraryService` operations. It depends on libcalibre, not Tauri or Axum. Hosts own
library selection, locking, authentication, filesystem/URL ingestion and asset
URL policy. Shared library behavior belongs in core; host-only work stays in its host.

The desktop package is named `citadel-desktop`; its directory remains `src-tauri`
for Tauri tooling convenience. IPC handlers delegate shared work to core while
retaining desktop-only setup, dialogs, imports, thumbnails and deletion/trash
orchestration. The desktop `library` module owns the IPC adapters and native
library setup; `imports` owns local-file import types. Adapters import shared
types directly from citadel-core, with no compatibility re-export modules.
Existing mutation IPC commands map shared errors to their string wire format;
book query/get expose the structured error contract directly. Those conversions
are transport responsibilities. Candidate-path discovery, asset caching and
native Trash handling remain host operations.

`citadel-server` maps Axum requests into those same operations. Utoipa derives
OpenAPI schemas alongside Specta from Rust DTOs; utoipa-axum registers handlers
and documents their routes together. OpenAPI describes HTTP behavior; it does not
implement the handlers. Blocking SQLite work runs outside Tokio workers, with a
bounded work semaphore held until work finishes even if the HTTP request expires.

Generate the HTTP schema and TypeScript client types with:

```sh
bun api:generate
bun api:check
```

This writes `api/openapi.json` and `src/lib/api/schema.generated.d.ts`.
`createCitadelHttpClient` wraps openapi-fetch with those generated paths. It is an
internal transport client, not a separate published SDK. The caller supplies the
server URL, credentials and fetch implementation. Do not edit generated files.

To refresh desktop IPC bindings without launching a window:

```sh
cargo run -p citadel-desktop -- --export-bindings
```

The export flag is debug-only. CI checks route/schema drift and type compatibility
between representative IPC and HTTP responses. Core tests cover shared behavior;
HTTP tests exercise real read-only libraries, authentication and error mapping.
Frontend service-boundary cleanup, a complete remote adapter, writable remote
operations and deployment compatibility remain separate follow-ups.
