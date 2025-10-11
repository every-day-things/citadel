# Tauri v1 to v2 Migration Plan

**Date:** October 10, 2025
**Objective:** Migrate Citadel app from Tauri v1.5.3 to Tauri v2.0
**Status:** Planning Phase

## Current State Analysis

### Dependencies (Tauri v1)
- **Rust:** `tauri = "1.5.3"`, `tauri-build = "1.5.0"`
- **JavaScript:** `@tauri-apps/cli = "^1"`, `@tauri-apps/api = "^1"`
- **Plugins:**
  - `tauri-plugin-drag = "0.2.0"`
  - `tauri-plugin-persisted-scope` (v1 branch)
- **Type Generation:** `tauri-specta = "=2.0.0-rc.4"`

### Current API Usage
- **Window Management:** `@tauri-apps/api/window.appWindow`
- **File Operations:** `@tauri-apps/api` (dialog, path, fs scope)
- **Shell Operations:** `@tauri-apps/api/shell.open`
- **Clipboard:** `@tauri-apps/api.clipboard.writeText`
- **Custom Commands:** 14 commands via tauri-specta

### Configuration
- Uses `tauri.conf.json` with allowlist permissions system
- Manual window creation in `main.rs` setup function
- Custom protocol and asset scope configuration

## Migration Strategy

### Phase 1: Automated Migration
**Goal:** Use Tauri's built-in migration tool to handle the bulk conversion

#### Steps:
1. **Update CLI to v2:**
   ```bash
   cd citadel
   bun add -D @tauri-apps/cli@latest
   ```

2. **Run automated migration:**
   ```bash
   bun run tauri migrate
   ```

3. **Document what the migration tool changed:**
   - Configuration file updates
   - Generated capability files
   - Any dependency updates
   - Migration warnings/errors

#### Expected Outcomes:
- `tauri.conf.json` converted to v2 format
- `src-tauri/capabilities/` directory created with permission files
- Possible dependency version bumps
- Migration report with manual steps needed

### Phase 2: Code Quality Assessment
**Goal:** Identify what breaks after automated migration

#### Rust Quality Checks:
```bash
cd src-tauri
cargo check
cargo clippy
cargo fmt --check
```

#### JavaScript Quality Checks:
```bash
bun format:check
bun lint
bun run build:web  # Check if frontend builds
```

#### TypeScript Checks:
```bash
npx tsc --noEmit
```

#### Tauri Build Check:
```bash
bun run tauri build --debug  # Test if Tauri app builds
```

### Phase 3: Manual Code Updates
**Goal:** Fix issues identified in Phase 2

#### Expected Frontend API Updates:

**Import Changes:**
```typescript
// OLD v1
import { invoke } from "@tauri-apps/api/tauri"
import { appWindow } from "@tauri-apps/api/window"
import { open } from "@tauri-apps/api/shell"
import { writeText } from "@tauri-apps/api/clipboard"
import { open as openDialog } from "@tauri-apps/api/dialog"

// NEW v2
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/webviewWindow"
import { open } from "@tauri-apps/plugin-shell"
import { writeText } from "@tauri-apps/plugin-clipboard-manager"
import { open as openDialog } from "@tauri-apps/plugin-dialog"
```

**Files Likely Needing Updates:**
- `src/bindings.ts` - Core invoke imports
- `src/App.tsx` - Window management
- `src/components/organisms/Sidebar.tsx` - Window operations
- `src/components/pages/Books.tsx` - Clipboard and shell usage
- `src/lib/path.ts` - Path utilities
- `src/lib/services/library/_internal/addBook.ts` - Dialog usage
- `src/lib/services/library/_internal/pickLibrary.ts` - Dialog usage

#### Expected Rust Updates:

**Plugin Registration:**
```rust
// In main.rs - add new plugin imports and registration
.plugin(tauri_plugin_dialog::init())
.plugin(tauri_plugin_shell::init())
.plugin(tauri_plugin_clipboard_manager::init())
```

**Dependency Updates in Cargo.toml:**
```toml
[dependencies]
tauri = "2.0"
tauri-plugin-dialog = "2"
tauri-plugin-shell = "2"
tauri-plugin-clipboard-manager = "2"
# Need to research v2 alternatives for:
# - tauri-plugin-drag
# - tauri-plugin-persisted-scope

[build-dependencies]
tauri-build = "2.0"
```

### Phase 4: Functionality Validation
**Goal:** Ensure app works as expected after migration

#### Manual Testing Checklist:
- [ ] App starts successfully
- [ ] Window operations (show/hide/minimize/maximize)
- [ ] File dialog operations (open library, file selection)
- [ ] Shell operations (opening URLs)
- [ ] Clipboard operations (copy text)
- [ ] Drag and drop functionality (if still working)
- [ ] All custom commands via tauri-specta
- [ ] Library import functionality
- [ ] Book management operations

#### Test Commands:
```bash
# Development mode
bun run dev

# Production build and test
bun run build
```

## Risk Assessment

### High Risk Items:
1. **Plugin Compatibility:** Some v1 plugins may not have v2 versions
   - `tauri-plugin-drag` - need to verify v2 availability
   - `tauri-plugin-persisted-scope` - may need replacement

2. **tauri-specta Compatibility:** Type generation may break
   - Current version: `2.0.0-rc.4`
   - May need update for v2 compatibility

3. **Custom Commands:** 14 commands need to work post-migration
   - All calibre-related commands
   - Type generation must continue working

### Medium Risk Items:
1. **Permission System:** New capability system may be too restrictive
2. **Window Management:** Manual window setup code may conflict
3. **Asset Protocol:** Custom protocol scope may need adjustment

### Low Risk Items:
1. **Configuration:** Automated migration should handle most changes
2. **Build System:** Should work with minimal changes
3. **Frontend Framework:** React/Vite setup should be unaffected

## Rollback Plan

1. **Git Branch:** Create `tauri-v2-migration` branch before starting
2. **Backup:** Keep original `package.json` and `Cargo.toml`
3. **Dependencies:** Document exact versions before migration
4. **Quick Rollback:** `git checkout main` if issues arise

## Success Criteria

### Must Have:
- [ ] App builds successfully (both dev and prod)
- [ ] All existing functionality works
- [ ] No TypeScript errors
- [ ] No Rust compiler errors
- [ ] All tests pass

### Nice to Have:
- [ ] Better performance (if any)
- [ ] Cleaner configuration
- [ ] Updated plugin ecosystem access

## Timeline Estimate

- **Phase 1 (Automated Migration):** 30 minutes
- **Phase 2 (Quality Assessment):** 1 hour
- **Phase 3 (Manual Updates):** 2-4 hours (depending on plugin issues)
- **Phase 4 (Validation):** 1 hour
- **Total:** 4.5-6.5 hours

## Next Actions

1. Execute Phase 1 (automated migration)
2. Document actual changes made by migration tool
3. Run Phase 2 quality checks
4. Create detailed remediation plan based on actual issues found
5. Execute manual fixes in Phase 3
6. Validate functionality in Phase 4

---

**Notes:**
- This plan will be updated as we discover the actual changes needed
- Focus on getting a working v2 app first, optimizations can come later
- Document any deviations from expected migration path for future reference
