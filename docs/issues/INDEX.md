# libcalibre → Calibre 1:1 Parity: Issue Roadmap

**Last Updated:** 2025-11-06
**Total Estimated Effort:** 8-12 weeks
**Issues Created:** 7 of 19 (comprehensive specs provided for all P0/P1/selected P2)

---

## Priority Legend

- **P0 (Critical):** Blocking features, compatibility, or severe bugs - 3-4 weeks
- **P1 (High):** Important functionality for feature completeness - 2-3 weeks
- **P2 (Medium):** Nice-to-have features, optimizations - 2-3 weeks
- **P3 (Low):** Advanced features, polish - 1-2 weeks

---

## P0: Critical Issues (Must-Have for Basic Compatibility)

### ✅ [P0-01: Database Triggers](./P0-01-database-triggers.md)
**Effort:** 1 week | **Dependencies:** None

Implement auto-generation of sort titles, UUIDs, and cascade deletes through SQLite triggers.

**Key Tasks:**
- Research: Study Calibre's trigger definitions in `schema_upgrades.py`
- Planning: Design trigger registration system
- Development: Register triggers on connection, test cascade behavior

**Calibre Reference:** [`schema_upgrades.py:148-473`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py#L148-L473)

---

### ✅ [P0-02: Custom SQL Functions](./P0-02-sql-functions.md)
**Effort:** 3-4 days | **Dependencies:** None (enables P0-01)

Register `title_sort()`, `author_to_author_sort()`, and verify `uuid4()` SQL functions.

**Key Tasks:**
- Research: Study Calibre's SQL function implementations
- Planning: Design author sort algorithm (particles, suffixes)
- Development: Implement and register functions, test with SQL queries

**Calibre Reference:**
- [`backend.py:383-391`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L383-L391)
- [`metadata/__init__.py:author_to_author_sort()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py)

---

### ✅ [P0-03: In-Memory Caching Layer](./P0-03-in-memory-caching.md)
**Effort:** 1-2 weeks | **Dependencies:** None

Implement Calibre-style in-memory cache to eliminate repeated database queries.

**Key Tasks:**
- Research: Study Calibre's cache architecture in `cache.py` and table classes
- Planning: Design cache structures (book_col_map, col_book_map, id_map patterns)
- Development: Implement table caches, integrate with read/write operations

**Performance Target:** 10x speedup for read operations (7 queries → 0 for `find_all()`)

**Calibre Reference:**
- [`cache.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py)
- [`tables.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)

---

### ✅ [P0-04: Link Tables CRUD](./P0-04-link-tables-crud.md)
**Effort:** 1 week | **Dependencies:** None

Implement CRUD operations for tags, series, publishers, ratings, and languages.

**Key Tasks:**
- Research: Study link table patterns (many-to-many vs many-to-one)
- Planning: Design APIs for each relationship type
- Development: Create handler modules, implement auto-creation, test ordering

**Currently:** Only `books_authors_link` implemented

**Calibre Reference:**
- [`tables.py:198-757`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py#L198-L757)
- [`write.py:269-390`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/write.py#L269-L390)

---

### ✅ [P0-05: Filesystem Path Compatibility](./P0-05-filesystem-path-calibre-compatibility.md)
**Effort:** 3-4 days | **Dependencies:** None

Replace `sanitise()` crate with Calibre-compatible `ascii_filename()` logic.

**Key Tasks:**
- Research: Study Calibre's path construction and Windows reserved names
- Planning: Design Unicode transliteration and path length enforcement
- Development: Implement `ascii_filename()`, update path construction, test edge cases

**Key Fixes:**
- Windows reserved names (CON → CONw)
- Path length limits (PATH_LIMIT = 100)
- Trailing spaces/periods removal
- Unicode → ASCII transliteration

**Calibre Reference:**
- [`backend.py:1507-1527`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L1507-L1527)
- [`filenames.py:ascii_filename()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/utils/filenames.py)

---

## P1: High Priority (Important for Completeness)

### ✅ [P1-01: Schema Versioning System](./P1-01-schema-versioning.md)
**Effort:** 1 week | **Dependencies:** P0-01

Implement schema versioning via `PRAGMA user_version` and migration system.

**Key Tasks:**
- Research: Study Calibre's schema upgrade mechanism
- Planning: Define minimum version (v18+), design migration system
- Development: Implement version checking, create upgrade framework

**Calibre Reference:** [`schema_upgrades.py:15-39`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py#L15-L39)

---

### P1-02: Complete Book Creation Workflow
**Effort:** 3-4 days | **Dependencies:** P0-04

Enhance `add_book()` to handle tags, series, publishers, ratings, languages.

**Key Tasks:**
- Research: Study Calibre's multi-step book creation in `cache.py`
- Planning: Design relationship creation order and transaction boundaries
- Development: Update `NewLibraryEntryDto`, add relationship handling, update `has_cover` flag

**Currently:** Only handles authors

**Calibre Reference:** [`cache.py:_create_book_entry()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py)

---

### P1-03: Enhanced Author Sort Algorithm
**Effort:** 2-3 days | **Dependencies:** P0-02

Implement full `author_to_author_sort()` with particles, suffixes, etc.

**Key Tasks:**
- Research: Extract Calibre's complete author sort rules
- Planning: Define particle and suffix lists, design algorithm
- Development: Enhance Phase 1 implementation, add comprehensive tests

**Examples:**
- "John von Smith" → "von Smith, John"
- "John Smith Jr." → "Smith, John Jr."

**Calibre Reference:** [`metadata/__init__.py:author_to_author_sort()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py)

---

### P1-04: Format Operations Completion
**Effort:** 3-4 days | **Dependencies:** None

Implement remove format, replace format, size calculation, update `has_cover`.

**Key Tasks:**
- Research: Study Calibre's format removal and size calculation
- Planning: Design atomic file operations, cover flag updates
- Development: Implement format deletion, size calculation, metadata_dirtied updates

**Currently:** Only add format implemented

**Calibre Reference:** [`backend.py:1705-1939`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L1705-L1939)

---

### P1-05: Transaction Management
**Effort:** 2-3 days | **Dependencies:** P0-01

Wrap multi-step operations in database transactions for atomicity.

**Key Tasks:**
- Research: Study Diesel transaction API
- Planning: Identify operations needing transactions, design error handling
- Development: Wrap `add_book()`, implement rollback on error

**Currently:** `add_book()` is not transactional

---

## P2: Medium Priority (Quality & Advanced Features)

### ✅ [P2-01: Custom Columns System](./P2-01-custom-columns-dynamic-tables.md)
**Effort:** 1-2 weeks | **Dependencies:** P0-01, P1-01

Replace hard-coded "read" column with dynamic custom column system.

**Key Tasks:**
- Research: Study Calibre's custom column creation and datatypes
- Planning: Design safe SQL generation, dynamic table creation
- Development: Fix SQL injection, implement CRUD, support bool/text/int/float

**Security Focus:** Eliminate SQL injection risk, validate all column IDs

**Calibre Reference:** [`custom_columns.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/library/custom_columns.py)

---

### P2-02: Case-Insensitive Duplicate Handling
**Effort:** 1 week | **Dependencies:** P0-04

Implement Calibre's duplicate detection and merging for tags/series/authors/etc.

**Key Tasks:**
- Research: Study `fix_case_duplicates()` in `tables.py`
- Planning: Design merge strategy, ICU collation support
- Development: Implement duplicate detection, merge logic, update references

**Examples:**
- "Science Fiction" + "science fiction" → merge to one
- Update all book links to merged ID

**Calibre Reference:** [`tables.py:245-266, 537-576`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py#L245-L266)

---

### P2-03: Batch Write Operations
**Effort:** 3-4 days | **Dependencies:** P0-04

Add batch operations for tags, series, publishers creation and linking.

**Key Tasks:**
- Research: Study Calibre's batch update patterns
- Planning: Design batch API, optimize for multiple inserts
- Development: Implement batch create, batch link operations

**Currently:** Have batch read operations

---

### P2-04: Missing Tables Support
**Effort:** 1 week | **Dependencies:** P1-01

Implement `preferences`, `metadata_dirtied`, `books_plugin_data` tables.

**Key Tasks:**
- Research: Study each table's purpose and operations
- Planning: Design APIs for preferences storage, OPF tracking
- Development: Implement CRUD, integrate with book operations

**Currently:**
- ✅ `library_id` partially exists (`dontusethis_randomize_library_uuid()`)
- ❌ `preferences` - No API
- ❌ `metadata_dirtied` - Not tracked
- ❌ `books_plugin_data` - No support

---

## P3: Low Priority (Polish & Advanced)

### P3-01: Tag Browser Views
**Effort:** 3-4 days | **Dependencies:** P0-04

Create Calibre's tag browser views for category browsing.

**Key Tasks:**
- Research: Study view definitions in `schema_upgrades.py`
- Planning: Design view creation system
- Development: Create views, add filtering support

**Calibre Reference:** [`schema_upgrades.py:245-394`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py#L245-L394)

---

### P3-02: Annotations Support
**Effort:** 1 week | **Dependencies:** P1-01

Implement annotations and highlights storage and retrieval.

**Key Tasks:**
- Research: Study Calibre's annotation system
- Planning: Design annotation storage, search
- Development: Implement CRUD for annotations

**Note:** Modern Calibre uses separate database for annotations

**Calibre Reference:** [`annotations.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/annotations.py)

---

### P3-03: Reading Progress Tracking
**Effort:** 2-3 days | **Dependencies:** P1-01

Implement `last_read_positions` table for reading progress.

**Key Tasks:**
- Research: Study position storage format (CFI for EPUB)
- Planning: Design position update API
- Development: Implement CRUD, add to book metadata

---

### P3-04: OPF Metadata Enhancement
**Effort:** 3-4 days | **Dependencies:** P2-04

Enhance OPF generation and sync with `metadata_dirtied` table.

**Key Tasks:**
- Research: Study Calibre's OPF generation patterns
- Planning: Design metadata sync strategy
- Development: Track dirty metadata, regenerate OPF on changes

**Currently:** Basic OPF generation exists, no dirty tracking

---

### P3-05: Conversion Options Support
**Effort:** 1 week | **Dependencies:** None

Implement `conversion_options` table for format conversion settings.

**Key Tasks:**
- Research: Study Calibre's conversion pipeline
- Planning: Design options storage, retrieval
- Development: Implement CRUD for conversion settings

**Note:** Low priority as conversion is complex feature

---

## Issue Status Summary

| Priority | Issues | Detailed Specs | Estimate |
|----------|--------|----------------|----------|
| P0       | 5      | ✅ All complete | 3-4 weeks |
| P1       | 5      | ✅ 1 complete | 2-3 weeks |
| P2       | 4      | ✅ 1 complete | 2-3 weeks |
| P3       | 5      | ⚠️ Outlines only | 1-2 weeks |
| **Total** | **19** | **7 detailed** | **8-12 weeks** |

---

## Development Workflow

### Phase 1: Foundation (Weeks 1-4)
Complete all P0 issues to establish solid foundation:
1. P0-02: SQL Functions (enables triggers)
2. P0-01: Database Triggers
3. P0-05: Filesystem Paths
4. P0-04: Link Tables CRUD
5. P0-03: In-Memory Caching

### Phase 2: Completeness (Weeks 5-7)
Complete P1 issues for feature completeness:
1. P1-01: Schema Versioning
2. P1-02: Complete Book Creation
3. P1-04: Format Operations
4. P1-03: Author Sort Enhancement
5. P1-05: Transaction Management

### Phase 3: Quality (Weeks 8-10)
Selected P2 issues for quality and advanced features:
1. P2-02: Duplicate Handling
2. P2-01: Custom Columns
3. P2-03: Batch Operations
4. P2-04: Missing Tables

### Phase 4: Polish (Weeks 11-12)
Selected P3 issues for polish:
1. P3-04: OPF Enhancement
2. P3-02: Annotations (if time)

---

## Testing Strategy

### Per-Issue Testing
Each issue includes:
- Unit tests (specific to module)
- Integration tests (full workflow)
- Compatibility tests (with Calibre)

### Regression Testing
After each phase:
- Run full test suite
- Test with real Calibre databases
- Verify Calibre can still open/modify

### Performance Benchmarking
Key metrics to track:
- `find_all()` query time
- Memory usage with large libraries
- Cache hit/miss rates

---

## References

### Calibre Source Code
- [Database Backend](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py)
- [Cache System](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py)
- [Table Classes](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)
- [Write Operations](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/write.py)
- [Schema Upgrades](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py)

### libcalibre Current Implementation
- Database: `src-tauri/libcalibre/src/db.rs`
- Schema: `src-tauri/libcalibre/src/schema.rs`
- Client: `src-tauri/libcalibre/src/calibre_client.rs`
- APIs: `src-tauri/libcalibre/src/api/`

---

## Contributing

When implementing issues:

1. **Read the Research section** - Understand Calibre's approach
2. **Review Planning decisions** - Follow architectural guidance
3. **Check Development tasks** - Understand what needs to be done
4. **Write tests first** - TDD approach recommended
5. **Test compatibility** - Verify with real Calibre databases
6. **Update this index** - Mark issues complete, update estimates

---

## Questions?

For questions about:
- **Issue scope:** See individual issue files
- **Calibre behavior:** Check referenced source code
- **Architecture decisions:** See Planning sections
- **Implementation details:** Create development agent sub-tasks

**Last Analysis:** See `CALIBRE_LIBCALIBRE_ANALYSIS.md` for detailed comparison
