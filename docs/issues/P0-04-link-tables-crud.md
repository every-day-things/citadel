# P0-04: Implement CRUD for All Link Tables

**Priority:** P0 (Blocking Features)
**Estimated Effort:** 1 week
**Dependencies:** None
**Labels:** `database`, `relationships`, `feature`

---

## Problem Statement

libcalibre only implements the `books_authors_link` table. All other relationships are missing:
- Tags
- Series
- Publishers
- Ratings
- Languages

This means books can't have tags, series, publishers, ratings, or languages assigned. These are core Calibre features.

## Current State

**Implemented:**
- ✅ `books_authors_link` - Full CRUD in `api/books.rs:82-116`

**Missing:**
- ❌ `books_tags_link`
- ❌ `books_series_link`
- ❌ `books_publishers_link`
- ❌ `books_ratings_link`
- ❌ `books_languages_link`

**Schema exists** for all tables in `schema.rs` but no operations.

---

## Research Phase

### Study Calibre's Link Table Patterns

**Source:** [`src/calibre/db/tables.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)

#### Pattern Analysis

All link tables follow similar patterns but with important differences:

##### 1. Simple Many-to-Many (Tags)

**Schema:**
```sql
CREATE TABLE books_tags_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    tag INTEGER NOT NULL,
    UNIQUE(book, tag)
);
```

**Operations:**
- Link tag to book: `INSERT INTO books_tags_link (book, tag) VALUES (?, ?)`
- Unlink tag: `DELETE FROM books_tags_link WHERE book=? AND tag=?`
- Get tags for book: `SELECT tag FROM books_tags_link WHERE book=?`
- Get books with tag: `SELECT book FROM books_tags_link WHERE tag=?`

**Auto-creation:** Tags are auto-created if they don't exist (see `tables.py:267-290`)

##### 2. Many-to-Many with Ordering (Authors, Languages)

**Schema:**
```sql
CREATE TABLE books_languages_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    lang_code INTEGER NOT NULL,
    item_order INTEGER NOT NULL,  -- Preserves order!
    UNIQUE(book, lang_code)
);
```

**Key Difference:** `item_order` field preserves author/language order for display

**Queries must ORDER BY item_order:**
```sql
SELECT author FROM books_authors_link
WHERE book=?
ORDER BY id;  -- id serves as implicit order
```

##### 3. Many-to-One (Series, Publisher, Rating)

**Schema:**
```sql
CREATE TABLE books_series_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL UNIQUE,  -- UNIQUE! One series per book
    series INTEGER NOT NULL
);
```

**Key Difference:** Each book can only have ONE series/publisher/rating

**Special Case - Series Index:**
Books have a `series_index` field (REAL) in the books table itself, separate from the link

##### 4. Composite Pattern (Ratings)

Ratings combine a link table with a value table:

**Tables:**
```sql
CREATE TABLE ratings (
    id INTEGER PRIMARY KEY,
    rating INTEGER NOT NULL UNIQUE  -- The actual 0-10 value
);

CREATE TABLE books_ratings_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL UNIQUE,
    rating INTEGER REFERENCES ratings(id)
);
```

**Special Logic:**
- Rating value 0 is treated as NULL (no rating)
- Must ensure rating value exists in `ratings` table before linking

#### Access Patterns from Calibre

**Source:** [`src/calibre/db/write.py:269-390`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/write.py#L269-L390)

**ManyToOne Operations** (Series, Publisher):
1. Find or create item by name (case-insensitive)
2. Check if book already has a link
3. Delete old link if exists
4. Create new link

**ManyToMany Operations** (Tags, Authors):
1. Find or create items by name (case-insensitive)
2. Get existing links for book
3. Calculate diff (add new, remove old)
4. Update links maintaining order

---

## Planning Phase

### Design Decisions

#### 1. API Surface

**Tags API:**
- `list_tags_for_book(book_id)` → `Vec<Tag>`
- `link_tag_to_book(book_id, tag_id)`
- `unlink_tag_from_book(book_id, tag_id)`
- `set_tags_for_book(book_id, tag_ids)` - Replace all
- `create_tag_if_missing(name)` → `Tag`

**Series API:**
- `get_series_for_book(book_id)` → `Option<Series>`
- `set_series_for_book(book_id, series_id)`
- `unlink_series_from_book(book_id)`
- `create_series_if_missing(name)` → `Series`

**Publishers, Ratings, Languages:** Similar patterns

#### 2. Auto-Creation Behavior

**Calibre's Approach:** When setting metadata, auto-create if item doesn't exist

**Implementation:**
- `create_if_missing()` methods check by name (case-insensitive)
- Return existing ID if found
- Create new if not found

#### 3. Order Preservation

**Authors and Languages:** Need order tracking

**Approach:**
- Use link table `id` as implicit order (insertion order)
- OR add explicit `item_order` column
- Always `ORDER BY id` in queries

#### 4. Where to Implement

**Option A:** Add to existing handlers
- `api/books.rs` - Add tag/series methods
- `api/authors.rs` - Keep author methods

**Option B:** New dedicated handlers
- `api/tags.rs`, `api/series.rs`, etc.

**Recommendation:** Option B - cleaner separation

---

## Development Phase

### Task Breakdown

#### 1. Create Tag Operations

**Location:** `src-tauri/libcalibre/src/api/tags.rs` (new file)

**Required Operations:**
- `create(name)` → Creates tag in `tags` table
- `create_if_missing(name)` → Returns existing or creates new
- `find_by_name(name)` → Case-insensitive search
- `list_tags_for_book(book_id)` → Query link table
- `link_tag_to_book(book_id, tag_id)` → Insert into link table
- `unlink_tag_from_book(book_id, tag_id)` → Delete from link table
- `set_tags_for_book(book_id, tag_ids)` → Replace all tags

**Database Changes:**
None needed - tables already exist in schema

#### 2. Create Series Operations

**Location:** `src-tauri/libcalibre/src/api/series.rs` (new file)

**Required Operations:**
- `create(name)` → Creates series
- `create_if_missing(name)`
- `find_by_name(name)`
- `get_series_for_book(book_id)` → Query link table
- `set_series_for_book(book_id, series_id)` → Upsert link (one per book)
- `unlink_series_from_book(book_id)`
- `update_series_index(book_id, index)` → Update books.series_index field

**Special Handling:**
- Series index stored in `books` table, not link table
- Must update both link and series_index together

#### 3. Create Publisher Operations

**Location:** `src-tauri/libcalibre/src/api/publishers.rs` (new file)

**Required Operations:**
Same pattern as Series (many-to-one relationship)

#### 4. Create Ratings Operations

**Location:** `src-tauri/libcalibre/src/api/ratings.rs` (new file)

**Required Operations:**
- `create_rating_value(rating)` → Ensure value exists in `ratings` table
- `get_rating_for_book(book_id)` → Return 0-10 or None
- `set_rating_for_book(book_id, rating)` → Upsert
- `unlink_rating_from_book(book_id)`

**Special Logic:**
- Rating of 0 = no rating (NULL)
- Must create rating value row before linking

#### 5. Create Languages Operations

**Location:** `src-tauri/libcalibre/src/api/languages.rs` (new file)

**Required Operations:**
- `create(lang_code)` → ISO 639 language code
- `create_if_missing(lang_code)`
- `list_languages_for_book(book_id)` → Ordered by item_order
- `set_languages_for_book(book_id, lang_ids)` → Maintains order

**Special Handling:**
- Use `item_order` field to preserve order
- Validate language codes (ISO 639-2)

#### 6. Integrate into CalibreClient

**Location:** `src-tauri/libcalibre/src/calibre_client.rs`

**Add handler methods:**
```rust
pub fn tags(&mut self) -> tags::TagsHandler
pub fn series(&mut self) -> series::SeriesHandler
pub fn publishers(&mut self) -> publishers::PublishersHandler
pub fn ratings(&mut self) -> ratings::RatingsHandler
pub fn languages(&mut self) -> languages::LanguagesHandler
```

#### 7. Update Book Creation Workflow

**Location:** `src-tauri/libcalibre/src/calibre_client.rs:47-144`

**Current:** Only handles authors

**Needs:**
- Accept tags in `NewLibraryEntryDto`
- Accept series in `NewLibraryEntryDto`
- Accept publisher in `NewLibraryEntryDto`
- Accept rating in `NewLibraryEntryDto`
- Accept languages in `NewLibraryEntryDto`
- Create/link all relationships during book creation

#### 8. Add Batch Operations

**For Performance:**
- `batch_get_tags(book_ids)` → `HashMap<book_id, Vec<Tag>>`
- `batch_get_series(book_ids)` → `HashMap<book_id, Series>`
- Similar for other relationships

**Follows Pattern:** Already used in `calibre_client.rs:238-347`

---

## Acceptance Criteria

### Tags
- [ ] CRUD operations implemented
- [ ] Case-insensitive name matching
- [ ] Auto-creation on `create_if_missing()`
- [ ] Link/unlink operations
- [ ] Batch queries

### Series
- [ ] CRUD operations implemented
- [ ] One series per book enforced
- [ ] Series index updates alongside link
- [ ] Handles series removal (sets index to 1.0)

### Publishers
- [ ] CRUD operations implemented
- [ ] One publisher per book enforced
- [ ] Auto-creation support

### Ratings
- [ ] Rating values in `ratings` table
- [ ] Link table operations
- [ ] 0 = no rating handled correctly
- [ ] Range validation (0-10)

### Languages
- [ ] ISO 639 language codes
- [ ] Order preservation
- [ ] Multiple languages per book
- [ ] Language code validation

### Integration
- [ ] All handlers accessible from `CalibreClient`
- [ ] Book creation accepts all relationships
- [ ] Batch operations for performance
- [ ] All tests pass
- [ ] Compatible with Calibre databases

---

## Testing Strategy

### Unit Tests
- Test each handler independently
- Test auto-creation behavior
- Test order preservation (languages, authors)
- Test constraints (one series per book)

### Integration Tests
- Create book with all relationships
- Update relationships
- Remove relationships
- Verify database state matches expectations

### Compatibility Tests
- Load existing Calibre database
- Read books with tags/series/etc.
- Modify relationships
- Verify Calibre can still read database

---

## References

- [Calibre Table Classes](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/tables.py)
- [Calibre Write Operations](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/write.py#L269-L390)
- Current implementation: `src-tauri/libcalibre/src/api/books.rs:82-116` (authors pattern)
- Schema definitions: `src-tauri/libcalibre/src/schema.rs`

---

## Follow-up Issues

- [ ] P1-07: Update book creation to handle all relationships
- [ ] P0-03: Cache link table data for performance
- [ ] P2-10: Case-insensitive duplicate merging for tags/series/etc.
