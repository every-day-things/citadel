# P0-03: Implement In-Memory Caching Layer

**Priority:** P0 (Critical - Performance)
**Estimated Effort:** 1-2 weeks
**Dependencies:** None
**Labels:** `performance`, `caching`, `architecture`

---

## Problem Statement

Every data access in libcalibre currently queries the database. This causes severe performance degradation:

- **Listing 1000 books:** ~1000+ queries vs Calibre's ~2 queries
- **Book detail page:** ~10 queries vs Calibre's cached lookup
- **Author name resolution:** N queries for N books vs single hash lookup

Calibre solves this with an in-memory cache layer that loads all table data on initialization and keeps it synchronized.

## Current State

- ❌ No caching layer
- ✅ Has batch query optimizations (`batch_get_descriptions`, `batch_get_author_links`, etc.)
- ⚠️ Every operation hits database directly
- ⚠️ `find_all()` uses 7 queries (better than naive, but not cached)

**Reference:** `src-tauri/libcalibre/src/calibre_client.rs:238-347` - `find_all()` implementation

---

## Research Phase

### Study Calibre's Cache Architecture

**Primary Source:** [`src/calibre/db/cache.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py)

#### Cache Structure (Lines 1-200)

Calibre's `Cache` class maintains in-memory representations of all tables:

1. **Field Tables** - One for each metadata field:
   - `OneToOneTable` - Direct book attributes (title, timestamp, path, etc.)
   - `ManyToOneTable` - Normalized single values (series, publisher)
   - `ManyToManyTable` - Normalized multiple values (authors, tags)

2. **Key Data Structures:**
   - `book_col_map` - `{book_id: value}` - Fast book → data lookup
   - `col_book_map` - `{value_id: {book_ids}}` - Fast data → books lookup
   - `id_map` - `{item_id: name}` - Fast ID → name resolution

3. **Access Pattern:**
   ```
   # Fast in-memory lookup
   cache.field_for('authors', book_id)  # → [Author objects]
   cache.field_for('tags', book_id)     # → [Tag objects]
   ```

#### Table Types and Their Maps

**Source:** [`src/calibre/db/tables.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)

##### OneToOneTable (Lines 104-137)
- Examples: `title`, `timestamp`, `path`, `uuid`, `has_cover`
- Cache: `book_col_map = {book_id: value}`
- Single value per book

##### ManyToOneTable (Lines 198-311)
- Examples: `series`, `publisher`, `rating`
- Caches:
  - `id_map = {item_id: name}`
  - `link_map = {item_id: url}`
  - `col_book_map = {item_id: {book_ids}}`
  - `book_col_map = {book_id: item_id}`

##### ManyToManyTable (Lines 409-576)
- Examples: `authors`, `tags`, `languages`
- Caches:
  - `id_map = {item_id: name}`
  - `link_map = {item_id: url}`
  - `col_book_map = {item_id: {book_ids}}`
  - `book_col_map = {book_id: tuple(item_ids)}`  # Ordered!

##### Special Tables

**AuthorsTable** (Lines 578-627)
- Additional cache: `asort_map = {author_id: sort_name}`

**FormatsTable** (Lines 629-714)
- Additional caches:
  - `fname_map = {book_id: {format: filename}}`
  - `size_map = {book_id: {format: size}}`

**IdentifiersTable** (Lines 716-757)
- Caches:
  - `book_col_map = {book_id: {type: value}}`
  - `col_book_map = {type: {book_ids}}`

#### Initialization and Synchronization

**Source:** [`src/calibre/db/cache.py:200-400`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py#L200-L400)

**Initialization:**
1. Open database connection
2. Load field metadata
3. Create table objects for each field
4. Call `table.read(db)` to populate caches
5. Fix any inconsistencies (`fix_link_table()`, `fix_case_duplicates()`)

**Write Operations:**
1. Acquire write lock
2. Update database
3. Update in-memory caches
4. Release lock

**Read Operations:**
1. Acquire read lock (shared)
2. Read from cache (no DB query)
3. Release lock

---

## Planning Phase

### Design Decisions

#### 1. Cache Architecture

**Option A: Per-table cache structs**
- Separate struct for each table type
- Similar to Calibre's Table classes
- Pros: Type-safe, clear separation
- Cons: More boilerplate

**Option B: Generic cache with type parameters**
- Single `TableCache<T>` struct
- Pros: Less code duplication
- Cons: Harder to handle different cache patterns

**Recommendation:** Option A - matches Calibre's proven design

#### 2. Initialization Strategy

**Option A: Lazy loading**
- Load caches on first access
- Pros: Faster startup
- Cons: First query still slow

**Option B: Eager loading**
- Load all caches on `CalibreClient::new()`
- Pros: Consistent performance, matches Calibre
- Cons: Slower initialization

**Recommendation:** Option B - match Calibre's behavior

#### 3. Synchronization Strategy

**Current:** Uses `Arc<Mutex<SqliteConnection>>` - single connection

**Needs:**
- Read-write lock for cache access
- Multiple readers OR single writer
- Update cache after every write operation

**Approach:**
- Wrap entire cache in `RwLock`
- Database writes must acquire write lock
- Reads can proceed concurrently with read lock

#### 4. Cache Invalidation

**Strategy:**
- **Write operations:** Update cache immediately after DB write
- **External changes:** Not supported (Calibre doesn't either)
- **Transactions:** Update cache only after commit

#### 5. What to Cache

**Phase 1 (P0):**
- ✅ Authors (id_map, asort_map, link_map, book mappings)
- ✅ Books (all one-to-one fields)
- ✅ Formats (fname_map, size_map)
- ✅ Identifiers

**Phase 2 (P1):**
- Tags, Series, Publishers, Ratings, Languages
- Comments
- Custom columns

---

## Development Phase

### Task Breakdown

#### 1. Create Table Cache Structures

**Location:** `src-tauri/libcalibre/src/cache/mod.rs` (new module)

**Required Structs:**

**`BooksCache`**
- Maps for all one-to-one fields (title, sort, timestamp, path, uuid, has_cover, etc.)
- `fn read(db: &Connection)` - Populate from database
- `fn update_book(&mut self, book_id, field, value)` - Update after write

**`AuthorsCache`**
- `id_map: HashMap<i32, String>` - author_id → name
- `asort_map: HashMap<i32, String>` - author_id → sort_name
- `link_map: HashMap<i32, String>` - author_id → url
- `col_book_map: HashMap<i32, HashSet<i32>>` - author_id → book_ids
- `book_col_map: HashMap<i32, Vec<i32>>` - book_id → [author_ids] (ordered!)
- `fn read(db: &Connection)` - Populate from database
- `fn link_author(&mut self, book_id, author_id)` - Update after link

**`FormatsCache`**
- `fname_map: HashMap<i32, HashMap<String, String>>` - book_id → {format → filename}
- `size_map: HashMap<i32, HashMap<String, i32>>` - book_id → {format → size}
- `book_col_map: HashMap<i32, Vec<String>>` - book_id → [formats]
- `fn read(db: &Connection)` - Populate from database
- `fn add_format(&mut self, book_id, format, filename, size)` - Update after add

**`IdentifiersCache`**
- `book_col_map: HashMap<i32, HashMap<String, String>>` - book_id → {type → value}
- `col_book_map: HashMap<String, HashSet<i32>>` - type → book_ids
- `fn read(db: &Connection)` - Populate from database

#### 2. Create Master Cache Container

**Location:** `src-tauri/libcalibre/src/cache/mod.rs`

**`LibraryCache` Struct:**
- Contains all table caches
- Wrapped in `Arc<RwLock<...>>`
- `fn new(db: &Connection)` - Initialize all caches
- `fn refresh()` - Reload from database

#### 3. Integrate Cache into CalibreClient

**Location:** `src-tauri/libcalibre/src/calibre_client.rs`

**Changes Needed:**
- Add `cache: Arc<RwLock<LibraryCache>>` field
- Initialize cache in `CalibreClient::new()`
- Update all read methods to use cache
- Update all write methods to update cache

#### 4. Update Read Operations

**Methods to Update:**
- `find_book_with_authors()` - Read from cache instead of DB
- `find_all()` - Read from cache, eliminate 7 queries → 0 queries
- `list_all_authors()` - Read from cache
- Author name lookups - Use `cache.authors.id_map`
- Format lookups - Use `cache.formats.fname_map`

**Expected Performance:**
- `find_all()` for 1000 books: 7 queries → 0 queries (after initial load)
- Book detail page: 10 queries → 0 queries
- Author resolution: N queries → 0 queries

#### 5. Update Write Operations

**Methods to Update:**
- `add_book()` - Update books_cache, authors_cache after insert
- `update_book()` - Update books_cache after update
- `create_authors()` - Update authors_cache after insert
- `link_author_to_book()` - Update authors_cache mappings
- `add_book_files()` - Update formats_cache after insert

**Pattern:**
```
1. Acquire write lock on cache
2. Perform database operation
3. Update cache with new data
4. Release write lock
```

#### 6. Handle Concurrency

**Read Operations:**
- Acquire read lock: `cache.read().unwrap()`
- Multiple readers can proceed simultaneously
- No blocking unless writer active

**Write Operations:**
- Acquire write lock: `cache.write().unwrap()`
- Blocks all readers until complete
- Ensures consistency

#### 7. Testing Strategy

**Unit Tests:**
- Test each cache struct's `read()` method
- Test cache update methods
- Verify maps stay synchronized

**Performance Tests:**
- Benchmark `find_all()` before and after caching
- Measure memory usage
- Verify no cache misses

**Integration Tests:**
- Create book → verify cache updated
- Delete book → verify cache updated
- Concurrent reads → verify no blocking
- Write during reads → verify consistency

---

## Acceptance Criteria

- [ ] All table caches implemented with appropriate data structures
- [ ] Cache initialized on `CalibreClient::new()`
- [ ] Read operations use cache (0 queries for cached data)
- [ ] Write operations update cache immediately
- [ ] `find_all()` eliminates database queries for cached fields
- [ ] Thread-safe with RwLock (multiple readers, single writer)
- [ ] Memory usage reasonable (<100MB for typical 1000-book library)
- [ ] Performance improvement measured and documented
- [ ] All existing tests pass
- [ ] No breaking changes to public API

---

## Performance Targets

### Before Caching
- `find_all(1000 books)`: 7 DB queries, ~500ms
- `find_book_with_authors(1 book)`: 6 DB queries, ~50ms
- Author name lookup: 1 DB query per lookup

### After Caching
- `find_all(1000 books)`: 0 DB queries (after initial load), ~50ms
- `find_book_with_authors(1 book)`: 0 DB queries, ~5ms
- Author name lookup: 0 DB queries, <1ms (hash lookup)

**Target:** 10x speedup for read operations

---

## Testing Instructions

### Measure Before and After

**Setup benchmark:**
```bash
cd src-tauri/libcalibre
# Add criterion benchmarks to Cargo.toml
cargo bench --bench cache_performance
```

**Manual Performance Test:**
1. Create database with 1000 books
2. Time `find_all()` operation
3. Implement caching
4. Time `find_all()` operation again
5. Compare results

**Memory Test:**
1. Monitor process memory before cache init
2. Initialize cache with 1000-book library
3. Monitor memory after
4. Verify increase is reasonable

---

## References

- [Calibre Cache Implementation](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/cache.py)
- [Calibre Table Abstractions](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)
- [Rust RwLock Documentation](https://doc.rust-lang.org/std/sync/struct.RwLock.html)
- Current implementation: `src-tauri/libcalibre/src/calibre_client.rs:238-347`

---

## Follow-up Issues

- [ ] P1-10: Cache tags, series, publishers tables
- [ ] P2-14: Cache invalidation on external changes
- [ ] P2-15: Cache persistence to disk (optional optimization)
- [ ] Performance: Benchmark and optimize cache access patterns
