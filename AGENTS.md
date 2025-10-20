# Citadel Development Guide

## Commands
- **Production build**: `bun run build` (builds frontend then backend via Tauri)
- **Dev mode**: `bun run dev` (starts Tauri app with hot reload)
- **Format**: `bun format` (formats both frontend & backend)
- **Lint**: `bun lint` (lints both)
- **Test**: `cargo test` (for Rust), `vitest` or `bun test` (for frontend)
- **Run single test**: `cargo test test_name` or `vitest run path/to/test.ts`

## Architecture
- **Tauri app**: Backend in Rust (src-tauri/), frontend in React/TypeScript (src/)
- **libcalibre**: Internal library for Calibre database operations (SQLite via Diesel ORM)
- **Main binary**: citadel-rs, runs embedded in Tauri
- **Tauri commands**: Tauri commands in `src-tauri/src/libs/calibre/{command,query}.rs` expose API to frontend
- **Tauri state**: Global state managed via CitadelState in `src-tauri/src/state.rs`
- **Database**: SQLite Calibre library, schema in `src-tauri/libcalibre/src/schema.rs`, migrations via diesel_migrations

## Code Style

### Rust

- Follow existing Rust idioms; use `Result<T, String>` for Tauri commands
- Imports: Group std, external crates, then internal modules
- Error handling: Use `thiserror` in libcalibre, map to String in Tauri layer
- Naming: snake_case functions, CamelCase types, prefix commands with `clb_cmd_` or `clb_query_`
- Types: Use specta derive for TS bindings on all Tauri command types
- No comments unless complex; keep code self-documenting

### TypeScript

- Imports: Use `type` keyword for type-only imports; group by `type` imports first, then value imports; use `@/` alias for src imports
- Types: Use `interface` for object shapes, `type` for unions/intersections; make generic names descriptive, e.g. `TDeviceType` instead of `D`
- Naming: camelCase functions/variables, PascalCase components/types, SCREAMING_SNAKE_CASE for const objects used as enums
- Components: Export as named exports (not default); use functional components with destructured props typed via interface
- Enums: Use `as const` objects instead of enums (e.g., `const AuthorSortOrder = { nameAz: "name-asc" } as const`)
- Structure: Organize as atoms/molecules/organisms for components; put hooks in `lib/hooks/`, services in `lib/services/`
- Async: Use `async`/`await`; check Tauri command results for `status === "error"` before accessing `data`
- Strict mode: `strictNullChecks` and `noUncheckedIndexedAccess` enabled; always handle undefined/null cases
- Use functional programming concepts
- Prefer Rust-style safety, utility types like Result and Option
