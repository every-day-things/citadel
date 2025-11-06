# Calibre vs libcalibre: Deep Database & Storage Analysis

**Date:** 2025-11-06
**Goal:** Achieve 1:1 feature parity with Calibre's database and storage business logic in Rust

---

## Executive Summary

This analysis compares Calibre's Python implementation (v7.20.0) with the current Rust libcalibre implementation. The focus is on database schema, table operations, filesystem storage patterns, and critical business logic that must be replicated for full compatibility.

**Key Findings:**
1. libcalibre implements basic CRUD operations but lacks critical Calibre-specific business logic
2. Missing filesystem path construction logic that matches Calibre's conventions
3. No support for custom columns (dynamic tables)
4. Missing triggers, cascading deletes, and data integrity constraints
5. Incomplete relationship management (many-to-many, many-to-one patterns)
6. No caching layer or in-memory table representations
7. Missing data normalization and case-insensitive duplicate handling

---

## Table of Contents

1. [Database Schema Comparison](#1-database-schema-comparison)
2. [Table-by-Table Analysis](#2-table-by-table-analysis)
3. [Filesystem Storage Logic](#3-filesystem-storage-logic)
4. [Critical Missing Features](#4-critical-missing-features)
5. [Business Logic Differences](#5-business-logic-differences)
6. [Recommendations](#6-recommendations)

---

## 1. Database Schema Comparison

### 1.1 Schema Evolution

**Calibre:**
- Uses SQLite with APSW driver (not sqlite3)
- Schema version tracked via `PRAGMA user_version`
- Incremental upgrades from version 0 to 18+
- Creates triggers, views, and custom functions
- Supports automatic schema migration

**libcalibre:**
- Uses Diesel ORM with rusqlite
- No schema versioning system
- Static schema definition in `schema.rs`
- No migration support
- ❌ **DEFICIENCY:** Cannot handle existing Calibre databases with older schema versions

### 1.2 Core Tables Present in Both

Both implementations have these core tables:
- `books` - Main book metadata
- `authors` - Author information
- `data` - Book file formats
- `comments` - Book descriptions
- `identifiers` - ISBN, ASIN, etc.
- `tags`, `series`, `publishers`, `ratings`, `languages`
- Link tables: `books_authors_link`, `books_tags_link`, etc.

### 1.3 Tables in Calibre Not in libcalibre

❌ **Missing Tables:**
- `library_id` - Library UUID tracking
- `preferences` - Database-stored preferences
- `metadata_dirtied` - Tracks books needing OPF backup
- `books_plugin_data` - Plugin-specific data storage
- `conversion_options` - Format conversion settings
- `feeds` - RSS feed configurations
- `annotations` - Annotations and highlights (separate DB in newer versions)
- `last_read_positions` - Reading progress tracking
- `custom_column_*` - Dynamically created custom field tables

---

## 2. Table-by-Table Analysis

### 2.1 Books Table

#### Calibre Implementation (`src/calibre/db/tables.py` + `backend.py`)

**Schema:**
```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Unknown' COLLATE NOCASE,
    sort TEXT COLLATE NOCASE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pubdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    series_index REAL NOT NULL DEFAULT 1.0,
    author_sort TEXT COLLATE NOCASE,
    isbn TEXT DEFAULT "" COLLATE NOCASE,
    lccn TEXT DEFAULT "" COLLATE NOCASE,
    path TEXT NOT NULL DEFAULT "",
    flags INTEGER NOT NULL DEFAULT 1,
    uuid TEXT,
    has_cover BOOL DEFAULT 0,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Triggers:**
```sql
-- Auto-generate sort title on insert
CREATE TRIGGER books_insert_trg AFTER INSERT ON books
BEGIN
    UPDATE books SET sort=title_sort(NEW.title), uuid=uuid4()
    WHERE id=NEW.id;
END;

-- Auto-update sort title on update
CREATE TRIGGER books_update_trg AFTER UPDATE ON books
BEGIN
    UPDATE books SET sort=title_sort(NEW.title)
    WHERE id=NEW.id AND OLD.title <> NEW.title;
END;

-- Cascade deletes to related tables
CREATE TRIGGER books_delete_trg AFTER DELETE ON books
BEGIN
    DELETE FROM books_authors_link WHERE book=OLD.id;
    DELETE FROM books_publishers_link WHERE book=OLD.id;
    DELETE FROM books_ratings_link WHERE book=OLD.id;
    DELETE FROM books_series_link WHERE book=OLD.id;
    DELETE FROM books_tags_link WHERE book=OLD.id;
    DELETE FROM data WHERE book=OLD.id;
    DELETE FROM comments WHERE book=OLD.id;
    DELETE FROM conversion_options WHERE book=OLD.id;
    DELETE FROM books_plugin_data WHERE book=OLD.id;
END;
```

**Business Logic:**
- `title_sort()` - Custom SQL function that moves articles (A, An, The) to end
- `uuid4()` - Generates UUIDs automatically on insert
- `path` - Constructed as `Author/Title (id)` with ASCII sanitization
- `has_cover` - Cached boolean for cover.jpg existence
- `last_modified` - Updated on any metadata change

**Path Construction Logic** (`backend.py:1507-1527`):
```python
def construct_path_name(self, book_id, title, author):
    book_id = f' ({book_id})'
    l = self.PATH_LIMIT - (len(book_id) // 2) - 2
    author = ascii_filename(author)[:l]
    title = ascii_filename(title.lstrip())[:l].rstrip()
    if not title:
        title = 'Unknown'[:l]
    while author[-1] in (' ', '.'):
        author = author[:-1]
    if not author:
        author = ascii_filename(_('Unknown'))
    if author.upper() in WINDOWS_RESERVED_NAMES:
        author += 'w'
    return f'{author}/{title}{book_id}'
```

Key points:
- Converts to ASCII-safe filenames
- Limits path length (PATH_LIMIT)
- Handles Windows reserved names (CON, PRN, etc.)
- Trims trailing spaces/periods from author
- Appends book ID in format " (123)"

#### libcalibre Implementation

**Schema** (`schema.rs:26-42`):
```rust
diesel::table! {
    books (id) {
        id -> Integer,
        title -> Text,
        sort -> Nullable<Text>,
        timestamp -> Nullable<Timestamp>,
        pubdate -> Nullable<Timestamp>,
        series_index -> Float,
        author_sort -> Nullable<Text>,
        isbn -> Nullable<Text>,
        lccn -> Nullable<Text>,
        path -> Text,
        flags -> Integer,
        uuid -> Nullable<Text>,
        has_cover -> Nullable<Bool>,
        last_modified -> Timestamp,
    }
}
```

**Operations** (`api/books.rs`):
- `create()` - Basic insert, manually fetches UUID after insert
- `list()` - Simple SELECT *
- `update()` - Basic UPDATE
- `find_by_id()` - Basic SELECT WHERE id
- Link/unlink authors
- CRUD for identifiers and descriptions
- Custom column handling for read state

**❌ DEFICIENCIES:**

1. **No Triggers:** Sort title not auto-generated on insert/update
2. **No UUID Generation:** Relies on SQL trigger which may not exist
3. **No Path Construction:** No equivalent to `construct_path_name()`
4. **No Cascade Deletes:** Deleting a book doesn't clean up related records
5. **No `title_sort()` Function:** Missing custom SQL function registration
6. **No `has_cover` Management:** Not updated when covers added/removed
7. **No `last_modified` Auto-update:** Not updated on metadata changes
8. **Hard-coded Read State Logic:** Uses custom_column_* table directly instead of dynamic column system

### 2.2 Authors Table

#### Calibre Implementation

**Schema:**
```sql
CREATE TABLE authors (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE,
    sort TEXT COLLATE NOCASE,
    link TEXT NOT NULL DEFAULT ""
);
```

**Storage Format:**
- Names stored with `|` instead of `,` for multi-part names (legacy format)
- `sort` defaults to `author_to_author_sort(name)` if not provided
- Example: "Smith, John" → sort: "Smith, John"
- Example: "John Smith" → sort: "Smith, John"

**Special Logic:**
- `AuthorsTable` class with special serialization (`tables.py:578-627`)
- Name stored as `name.replace(',', '|')`
- Displayed as `name.replace('|', ',')`
- `asort_map` - In-memory map of author_id → sort_name
- `link_map` - In-memory map of author_id → URL

**Operations:**
- `set_sort_names()` - Bulk update author sort values
- `set_links()` - Bulk update author URLs
- `rename_item()` - Renames author, handles case-insensitive duplicates
- Case-insensitive duplicate merging during `fix_case_duplicates()`

#### libcalibre Implementation

**Schema** (`schema.rs:16-23`):
```rust
diesel::table! {
    authors (id) {
        id -> Integer,
        name -> Text,
        sort -> Nullable<Text>,
        link -> Text,
    }
}
```

**Operations** (`api/authors.rs`):
- `create()` - Basic insert
- `list()` - SELECT *
- `find_by_id()`, `find_by_name()`
- `update()` - Basic UPDATE
- `delete()` - Only if no books linked
- `name_author_dir()` - Returns author name for directory naming

**❌ DEFICIENCIES:**

1. **No Pipe Serialization:** Doesn't handle `|` ↔ `,` conversion
2. **No Author Sort Auto-generation:** Doesn't call `author_to_author_sort()`
3. **No Link Management:** No bulk link operations
4. **No Case-Insensitive Duplicate Merging:** Could create "John Smith" and "john smith"
5. **No In-Memory Caching:** Every operation hits the database
6. **Incomplete `name_author_dir()`:** Just returns name, doesn't do ASCII sanitization
7. **No Rename with Merge:** `update()` doesn't merge if target name exists

### 2.3 Data Table (Book Files/Formats)

#### Calibre Implementation

**Schema:**
```sql
CREATE TABLE data (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    format TEXT NOT NULL COLLATE NOCASE,
    uncompressed_size INTEGER NOT NULL,
    name TEXT NOT NULL
);
```

**Business Logic:**
- `format` always uppercase (e.g., "EPUB", "PDF")
- `name` is the base filename without extension (e.g., "The Book")
- Full path: `{library_path}/{book.path}/{name}.{format.lower()}`
- `uncompressed_size` used for library size calculations

**Operations** (`tables.py:629-714`):
- `FormatsTable` - ManyToManyTable subclass
- `fname_map` - In-memory: `{book_id: {format: filename}}`
- `size_map` - In-memory: `{book_id: {format: size}}`
- `update_fmt()` - Adds or replaces format
- `remove_formats()` - Batch delete formats
- `set_fname()` - Updates filename
- No duplicate formats per book (UNIQUE constraint)

**File Operations** (`backend.py:1892-1939`):
```python
def add_format(self, book_id, fmt, stream, title, author, path,
               current_name, mtime=None):
    # 1. Construct book directory path
    # 2. Create directory if not exists
    # 3. Generate filename: {name}.{fmt.lower()}
    # 4. Copy stream to file
    # 5. Calculate uncompressed size
    # 6. Insert/update in data table
    # 7. Update formats_table in-memory cache
    # 8. Update has_cover if cover added
```

#### libcalibre Implementation

**Schema** (`schema.rs:76-83`):
```rust
diesel::table! {
    data (id) {
        id -> Integer,
        book -> Integer,
        format -> Text,
        uncompressed_size -> Integer,
        name -> Text,
    }
}
```

**Operations** (`api/book_files.rs`):
- `create()` - Basic insert
- `update()` - Basic update
- `find_by_id()` - Basic select
- `list_all_by_book_id()` - SELECT WHERE book=?
- `batch_list_by_book_ids()` - Batch query for multiple books

**❌ DEFICIENCIES:**

1. **No File Operations:** Only database operations, no actual file handling
2. **No Format Uppercase Enforcement:** Could store "epub" vs "EPUB"
3. **No Path Construction:** Doesn't know how to build file paths
4. **No Duplicate Prevention:** Could create multiple EPUB entries
5. **No Size Calculation:** Doesn't compute uncompressed_size
6. **No In-Memory Cache:** No `fname_map` or `size_map`
7. **No File Rename Operations:** Can't rename files on disk
8. **No Format Removal:** Can't delete files from disk

### 2.4 Comments Table

#### Calibre Implementation

**Schema:**
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    text TEXT NOT NULL
);
```

**Business Logic:**
- One comment per book (enforced by application logic)
- Stores HTML content
- NULL comments handled as no description

**Operations:**
- INSERT OR REPLACE pattern for upsert
- OneToOneTable in different table pattern

#### libcalibre Implementation

**Schema** (`schema.rs:45-50`):
```rust
diesel::table! {
    comments (id) {
        id -> Integer,
        book -> Integer,
        text -> Text,
    }
}
```

**Operations** (`api/books.rs:186-228`):
- `get_description()` - Returns Optional<String>
- `set_description()` - Upserts comment
- Uses check-then-insert/update pattern

**✅ RELATIVELY COMPLETE:** This is one of the better-implemented tables in libcalibre.

**Minor Deficiency:**
- Could use INSERT OR REPLACE instead of check-then-upsert

### 2.5 Identifiers Table

#### Calibre Implementation

**Schema:**
```sql
CREATE TABLE identifiers (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    type TEXT NOT NULL DEFAULT "isbn" COLLATE NOCASE,
    val TEXT NOT NULL COLLATE NOCASE,
    UNIQUE(book, type)
);
```

**Business Logic:**
- `type` is lowercase (e.g., "isbn", "asin", "goodreads")
- UNIQUE constraint on (book, type)
- Special handling in metadata adapter:
  - Cleans `:` and `,` from type
  - Replaces `,` with `|` in value

**Operations** (`tables.py:716-757`):
- `IdentifiersTable` - Special ManyToMany variant
- `book_col_map` - `{book_id: {type: value}}`
- `col_book_map` - `{type: {book_ids}}`
- No direct item operations (tied to books)

#### libcalibre Implementation

**Schema** (`schema.rs:94-101`):
```rust
diesel::table! {
    identifiers (id) {
        id -> Integer,
        book -> Integer,
        #[sql_name = "type"]
        type_ -> Text,
        val -> Text,
    }
}
```

**Operations** (`api/books.rs:122-180`):
- `list_identifiers_for_book()` - Basic query
- `upsert_book_identifier()` - Handles insert or update
- `delete_book_identifier()` - Deletes identifier
- Lowercases type on insert

**✅ MOSTLY COMPLETE**

**Minor Deficiencies:**
- Doesn't clean `:` and `,` from type
- Doesn't replace `,` with `|` in value
- No in-memory caching

### 2.6 Link Tables (Many-to-Many Relationships)

#### Calibre Implementation

**Pattern:**
- `books_{table}_link` tables (e.g., `books_authors_link`)
- Always have: `id`, `book`, `{table}_id`
- For ordered relationships (authors, languages): also have ordering column
- ManyToMany relationships cached in memory

**Example - books_authors_link:**
```sql
CREATE TABLE books_authors_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    author INTEGER NOT NULL,
    UNIQUE(book, author)
);
```

**In-Memory Representation:**
- `book_col_map` - `{book_id: tuple(item_ids)}` - ordered
- `col_book_map` - `{item_id: set(book_ids)}`
- Both kept in sync for fast lookups

**Operations:**
- `read_maps()` - Loads from DB into memory
- `fix_link_table()` - Removes orphaned links
- Automatic cleanup on book/item deletion

#### libcalibre Implementation

**Schema** (`schema.rs:176-181`):
```rust
diesel::table! {
    books_authors_link (id) {
        id -> Integer,
        book -> Integer,
        author -> Integer,
    }
}
```

**Operations** (`api/books.rs:82-116`):
- `find_author_ids_by_book_id()` - Basic query
- `link_author_to_book()` - INSERT
- `unlink_author_from_book()` - DELETE
- No ordering support
- No in-memory cache

**❌ DEFICIENCIES:**

1. **No In-Memory Cache:** Every operation queries DB
2. **No Ordering:** Can't preserve author order
3. **No Batch Operations:** No `batch_link_authors()`
4. **No Orphan Cleanup:** No `fix_link_table()` equivalent
5. **No Duplicate Prevention:** Could create same link twice
6. **All Other Link Tables:** Only authors implemented, missing:
   - `books_tags_link`
   - `books_series_link`
   - `books_publishers_link`
   - `books_ratings_link`
   - `books_languages_link`

### 2.7 Custom Columns (Dynamically Created Tables)

#### Calibre Implementation

**Master Table:**
```sql
CREATE TABLE custom_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    datatype TEXT NOT NULL,
    mark_for_delete BOOL DEFAULT 0 NOT NULL,
    editable BOOL DEFAULT 1 NOT NULL,
    display TEXT DEFAULT "{}" NOT NULL,
    is_multiple BOOL DEFAULT 0 NOT NULL,
    normalized BOOL NOT NULL
);
```

**Supported Datatypes:**
- `text` - Single or multiple text values
- `series` - Series with index
- `enumeration` - Enum from fixed set
- `datetime` - Date/timestamp
- `float`, `int` - Numbers
- `bool` - Boolean
- `rating` - Star rating (0-10)
- `comments` - Long text/HTML
- `composite` - Computed from template

**Dynamic Table Creation:**

For normalized fields (is_multiple=True or datatype needs normalization):
```sql
-- Column table
CREATE TABLE custom_column_1 (
    id INTEGER PRIMARY KEY,
    value {TYPE} NOT NULL,
    UNIQUE(value)
);

-- Link table
CREATE TABLE books_custom_column_1_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    value INTEGER NOT NULL,
    UNIQUE(book, value)
);
```

For simple fields:
```sql
CREATE TABLE custom_column_2 (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL UNIQUE,
    value {TYPE} NOT NULL
);
```

**Business Logic** (`library/custom_columns.py`):
- Dynamic table creation on custom column add
- Metadata integration (shows in book details)
- Search integration
- Import/export support

#### libcalibre Implementation

**Schema** (`schema.rs:62-73`):
```rust
diesel::table! {
    custom_columns (id) {
        id -> Integer,
        label -> Text,
        name -> Text,
        datatype -> Text,
        mark_for_delete -> Bool,
        editable -> Bool,
        display -> Text,
        is_multiple -> Bool,
        normalized -> Bool,
    }
}
```

**Operations:**
- Hard-coded read state column in `api/books.rs:233-310`
- `get_or_create_read_state_custom_column()` - Creates if missing
- `get_book_read_state()`, `set_book_read_state()` - Read/write

**❌ MAJOR DEFICIENCIES:**

1. **No Dynamic Table Creation:** Can't create custom column tables
2. **Hard-coded Single Column:** Only "read" column implemented
3. **No General API:** Can't add/remove/list custom columns
4. **No Datatype Support:** Only bool implemented
5. **SQL Injection Risk:** String formatting in queries (lines 263-264, 279-280, 302-303)
6. **No Metadata Integration:** Not exposed in general book API

---

## 3. Filesystem Storage Logic

### 3.1 Directory Structure

#### Calibre Pattern

```
{library_path}/
├── metadata.db              # Main database
├── metadata_db_prefs_backup.json
├── cover.jpg                # Default cover
├── {Author}/
│   └── {Title} ({book_id})/
│       ├── cover.jpg
│       ├── metadata.opf
│       ├── {filename}.epub
│       ├── {filename}.pdf
│       └── ...
```

**Path Construction Rules:**
1. ASCII-only filenames
2. Max path length enforcement (PATH_LIMIT)
3. Windows reserved name handling (CON → CONw)
4. Trailing space/period removal
5. Book ID appended as " (123)"

**Code Reference:** `backend.py:1507-1527`

#### libcalibre Implementation

**❌ COMPLETE ABSENCE:** No filesystem operations implemented

**Missing Functionality:**
- No path construction
- No file copying
- No cover management
- No directory creation
- No file deletion
- No file existence checks

### 3.2 File Naming

#### Calibre Pattern

**Format Files:**
- Base name from `data.name` field
- Extension from `data.format` (lowercase)
- Full path: `{library_path}/{book.path}/{data.name}.{format.lower()}`
- Example: `/library/Smith, John/The Great Book (42)/The Great Book.epub`

**Cover Files:**
- Always named `cover.jpg` (JPEG format)
- Stored in book directory
- `books.has_cover` flag tracks existence

**Metadata Files:**
- `metadata.opf` - OPF XML file
- Generated on demand or cached
- `metadata_dirtied` table tracks books needing OPF update

#### libcalibre Implementation

**❌ NOT IMPLEMENTED**

### 3.3 File Operations

#### Calibre Implementation

**Add Format** (`backend.py:1892-1939`):
1. Get/create book directory path
2. Calculate target filename
3. Copy stream to target location
4. Calculate uncompressed size
5. Update `data` table
6. Update in-memory cache
7. Trigger metadata dirty flag

**Remove Format** (`backend.py:1705-1719`):
1. Delete file from disk
2. Remove from `data` table
3. Update in-memory cache
4. Update max size if needed

**Update Path** (`backend.py:1940-2039`):
1. Calculate new path based on title/author
2. Rename directory on disk
3. Rename format files if needed
4. Update `books.path`
5. Handle collisions

**Copy Format** (`backend.py:1834-1879`):
- Copy with or without hardlinks
- Handle Windows file locking
- Progress reporting
- Atomic operations

#### libcalibre Implementation

**❌ NONE OF THIS EXISTS**

---

## 4. Critical Missing Features

### 4.1 Database Features

| Feature | Calibre | libcalibre | Impact |
|---------|---------|------------|--------|
| Schema versioning | ✅ | ❌ | Can't upgrade old DBs |
| Triggers | ✅ | ❌ | Data integrity issues |
| Custom SQL functions | ✅ | ❌ | title_sort, uuid4 broken |
| Views | ✅ | ❌ | Tag browser broken |
| Cascade deletes | ✅ | ❌ | Orphaned records |
| Transactions | ✅ | ⚠️ | Diesel provides, not used consistently |
| Connection pooling | ✅ | ⚠️ | Single connection with Mutex |

### 4.2 Data Integrity

| Feature | Calibre | libcalibre | Impact |
|---------|---------|------------|--------|
| Case-insensitive duplicates | ✅ | ❌ | Can create "Tag" and "tag" |
| UNIQUE constraints | ✅ | ⚠️ | Defined but not enforced in code |
| Foreign key checks | ✅ | ⚠️ | May be enabled by SQLite |
| Data validation | ✅ | ❌ | Bad data can enter |
| Normalization | ✅ | ❌ | Denormalized data |

### 4.3 In-Memory Caching

#### Calibre's Cache Layer (`cache.py`)

**Purpose:** Avoid repeated DB queries, provide fast access

**Cached Data:**
- All table maps (`book_col_map`, `col_book_map`, `id_map`)
- Field metadata
- UUIDs
- Formats and filenames
- Author sorts
- Links

**Cache Invalidation:**
- Automatic on write operations
- Write lock for consistency
- Read lock for queries

#### libcalibre

**❌ NO CACHING:** Every operation queries the database

**Performance Impact:**
- Listing 1000 books with authors: ~1000+ queries vs ~2 in Calibre
- Each book detail page: ~10 queries vs cached lookup

### 4.4 Missing Tables

| Table | Purpose | Impact if Missing |
|-------|---------|-------------------|
| `library_id` | Library UUID tracking | Can't identify library uniquely |
| `preferences` | Settings storage | Settings stored externally or lost |
| `metadata_dirtied` | OPF backup tracking | Can't maintain metadata backups |
| `books_plugin_data` | Plugin data | No plugin support |
| `conversion_options` | Format conversion | Can't convert formats |
| `feeds` | RSS feeds | No feed support |
| `annotations` | Highlights/notes | No annotation support |
| `last_read_positions` | Reading progress | No progress tracking |

---

## 5. Business Logic Differences

### 5.1 Book Creation

#### Calibre (`cache.py:_create_book_entry`)

```python
def _create_book_entry(self, mi, apply_import_tags=True):
    # 1. Validate metadata
    # 2. Generate title_sort, author_sort
    # 3. Construct filesystem path
    # 4. Create directory
    # 5. Insert into books table (triggers fire)
    # 6. Add authors (create if needed, link)
    # 7. Add tags (create if needed, link)
    # 8. Add series (create if needed, link)
    # 9. Add identifiers
    # 10. Add comments
    # 11. Add custom columns
    # 12. Update caches
    # 13. Mark metadata dirty
    # 14. Return book_id
```

#### libcalibre (`api/books.rs:create`)

```rust
pub fn create(&self, new_book: NewBook) -> Result<BookRow, ()> {
    // 1. Insert into books
    // 2. Fetch UUID (because trigger might not exist)
    // 3. Return book row
    // No authors, tags, path construction, etc.
}
```

**❌ MAJOR DEFICIENCY:** Book creation is incomplete and doesn't follow Calibre's multi-step process

### 5.2 Author Sort

#### Calibre

**Algorithm** (`metadata/__init__.py:author_to_author_sort`):
```python
# "John Smith" → "Smith, John"
# "Smith, John" → "Smith, John" (unchanged)
# "John von Smith" → "von Smith, John"
# "John Smith Jr." → "Smith, John Jr."
```

**Rules:**
- Detect if already in "Last, First" format
- Handle particles (von, van, de, etc.)
- Handle suffixes (Jr., Sr., III, etc.)
- Handle multi-word last names

#### libcalibre

**❌ NOT IMPLEMENTED**

Uses author name as-is or user-provided sort value. No automatic generation.

### 5.3 Title Sort

#### Calibre

**Algorithm** (`persistence.py:sort_book_title`):
```python
# "The Great Book" → "Great Book, The"
# "A Tale" → "Tale, A"
# "An Adventure" → "Adventure, An"
```

**Implementation in libcalibre:**
```rust
pub fn sort_book_title(title: String) -> String {
    let title_pattern: &str = r"(A|The|An)\s+";
    let title_pattern_regex: Regex = Regex::new(title_pattern).unwrap();

    if let Some(matched) = title_pattern_regex.find(&title) {
        let preposition = matched.as_str();
        let new_title = format!("{}, {}",
                                title.replacen(preposition, "", 1),
                                preposition);
        return new_title.trim().to_string();
    }

    title.clone()
}
```

**✅ MOSTLY IMPLEMENTED**

**Minor Issues:**
- Only matches start of string (no case sensitivity option)
- Doesn't handle Unicode properly
- Not registered as SQL function

### 5.4 Path Sanitization

#### Calibre

**Algorithm** (`filenames.py:ascii_filename`):
```python
# Unicode → ASCII transliteration
# "Józef Müller" → "Jozef Muller"
# Remove/replace illegal characters
# Handle Windows reserved names
# Limit length
# Handle case-insensitive filesystems
```

#### libcalibre

**❌ NOT IMPLEMENTED**

No path construction or sanitization logic exists.

### 5.5 Format Operations

#### Calibre Pattern

**Add Format:**
1. Validate format is supported
2. Calculate target path
3. Create directories if needed
4. Copy file (with hardlink option)
5. Calculate uncompressed size (scan ZIP, etc.)
6. Update database
7. Update caches
8. Run post-import plugins
9. Mark metadata dirty

**Update Format:**
1. Check if replacing existing
2. Delete old file if replacing
3. Follow "Add Format" process
4. Update size calculations

#### libcalibre

**❌ NO FILE OPERATIONS:** Only database records, no actual files

---

## 6. Recommendations

### 6.1 Immediate Priorities (P0)

1. **Implement Filesystem Operations**
   - Path construction following Calibre's rules
   - File copying, moving, deleting
   - Cover management
   - Directory creation/deletion

2. **Add Database Triggers**
   - Auto-generate sort titles
   - Auto-generate UUIDs
   - Cascade deletes
   - Auto-update last_modified

3. **Register Custom SQL Functions**
   - `title_sort()`
   - `author_to_author_sort()`
   - `uuid4()`

4. **Implement In-Memory Caching**
   - Table classes similar to Calibre
   - `read()` methods to load caches
   - Update caches on writes

5. **Add Missing Link Tables**
   - Implement all `books_*_link` tables
   - Add CRUD operations
   - Support ordering where applicable

### 6.2 High Priority (P1)

6. **Schema Versioning System**
   - Check `PRAGMA user_version`
   - Implement migration system
   - Handle schema upgrades

7. **Complete Book Creation**
   - Multi-step creation process
   - Author auto-creation
   - Tag auto-creation
   - Identifier handling
   - Custom column population

8. **Author Sort Auto-Generation**
   - Implement `author_to_author_sort()`
   - Apply on author creation/update

9. **Path Sanitization**
   - Implement `ascii_filename()`
   - Handle Windows reserved names
   - Length limiting

10. **Format Operations**
    - Add format with file copying
    - Remove format with file deletion
    - Update format with replacement
    - Size calculation

### 6.3 Medium Priority (P2)

11. **Case-Insensitive Duplicate Handling**
    - Implement `fix_case_duplicates()` for all tables
    - Merge duplicates on detection
    - ICU collation support

12. **Custom Columns**
    - Dynamic table creation
    - All datatype support
    - General API (not just "read" column)
    - Fix SQL injection vulnerabilities

13. **Missing Tables**
    - `library_id` - Track library UUID
    - `preferences` - Settings storage
    - `metadata_dirtied` - OPF tracking
    - `books_plugin_data` - Plugin data

14. **Transaction Management**
    - Wrap multi-step operations in transactions
    - Proper error handling and rollback

15. **Batch Operations**
    - Batch author/tag/series creation
    - Batch linking operations
    - Bulk updates

### 6.4 Lower Priority (P3)

16. **Views and Tag Browser**
    - Create tag browser views
    - Filtered views
    - Aggregate functions

17. **Annotations & Reading Progress**
    - `annotations` table support
    - `last_read_positions` support

18. **Conversion & Feeds**
    - `conversion_options` table
    - `feeds` table

19. **OPF Metadata**
    - Generate OPF XML
    - Sync with `metadata_dirtied`

20. **Plugin Support**
    - `books_plugin_data` API
    - Plugin hooks

### 6.5 Architectural Recommendations

#### Use APSW Instead of rusqlite

Calibre uses APSW (Another Python SQLite Wrapper) instead of Python's built-in sqlite3 because:
- Better error messages
- More complete SQLite API access
- Better handling of custom functions and collations

**Rust Equivalent:** Consider `rusqlite` with full feature flags or direct SQLite FFI bindings for complete control.

#### Implement Table Abstraction Layer

Create a trait system similar to Calibre's Table classes:

```rust
trait Table {
    fn read(&mut self, db: &Connection);
    fn remove_books(&mut self, book_ids: &[i32], db: &Connection);
    fn fix_link_table(&mut self, db: &Connection);
    fn fix_case_duplicates(&mut self, db: &Connection);
}

enum TableType {
    OneToOne,
    ManyToOne,
    ManyToMany,
}
```

#### Create a Cache Layer

```rust
struct Cache {
    books: BooksTable,
    authors: AuthorsTable,
    formats: FormatsTable,
    // ...
    write_lock: Mutex<()>,
}

impl Cache {
    fn field_for(&self, field: &str, book_id: i32) -> Option<Value>;
    fn set_field(&mut self, field: &str, book_id: i32, value: Value);
    fn refresh(&mut self);
}
```

#### Filesystem Abstraction

```rust
trait FilesystemOps {
    fn construct_path(&self, book_id: i32, title: &str, author: &str) -> PathBuf;
    fn add_format(&mut self, book_id: i32, fmt: &str, stream: &mut Read) -> Result<()>;
    fn remove_format(&mut self, book_id: i32, fmt: &str) -> Result<()>;
    fn copy_cover(&mut self, book_id: i32, source: &Path) -> Result<()>;
}
```

---

## Conclusion

libcalibre currently implements basic CRUD operations for a subset of Calibre's database tables but lacks the critical business logic, filesystem operations, caching layer, and data integrity features that make Calibre a robust library management system.

**To achieve 1:1 parity, libcalibre needs:**

1. ✅ **Core tables present** - Good foundation
2. ❌ **Business logic** - Needs complete rewrite
3. ❌ **Filesystem operations** - Not implemented at all
4. ❌ **In-memory caching** - Not implemented
5. ❌ **Data integrity** - Missing triggers, constraints
6. ⚠️ **Performance** - Will be slower without caching
7. ❌ **Compatibility** - Can't handle real Calibre databases

**Estimated Effort:**
- P0 items: ~4-6 weeks
- P1 items: ~3-4 weeks
- P2 items: ~3-4 weeks
- P3 items: ~2-3 weeks

**Total: ~12-17 weeks for full parity**

The Rust implementation has the potential to be faster and safer than Calibre's Python code, but significant work is needed to match the feature set and subtle behaviors that users depend on.
