# P0-01: Implement Database Triggers for Data Integrity

**Priority:** P0 (Critical)
**Estimated Effort:** 1 week
**Dependencies:** None
**Labels:** `database`, `data-integrity`, `compatibility`

---

## Problem Statement

libcalibre currently lacks the database triggers that Calibre uses to maintain data integrity and automatically generate computed fields. This causes several issues:

1. **Sort titles not auto-generated** - Books inserted without proper `sort` field for alphabetization
2. **UUIDs not auto-generated** - Books may lack UUIDs, breaking Calibre compatibility
3. **Orphaned records** - Deleting a book doesn't clean up related records (comments, identifiers, file records)
4. **Inconsistent data** - Manual updates required for `last_modified`, `has_cover`, etc.

## Current State

- ❌ No triggers registered in database
- ⚠️ Manual UUID fetch after insert (workaround in `api/books.rs:42`)
- ❌ No cascade deletes
- ❌ No automatic field updates

## Research Phase

### Study Calibre's Trigger Implementation

**Primary Source:** [`src/calibre/db/schema_upgrades.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py)

#### 1. Books Insert Trigger (Lines 209-212)

```python
CREATE TRIGGER books_insert_trg AFTER INSERT ON books
BEGIN
    UPDATE books SET sort=title_sort(NEW.title), uuid=uuid4()
    WHERE id=NEW.id;
END;
```

**Purpose:** Automatically generate:
- `sort` field using `title_sort()` SQL function
- `uuid` field using `uuid4()` SQL function

#### 2. Books Update Trigger (Lines 443-448)

```python
CREATE TRIGGER books_update_trg AFTER UPDATE ON books
BEGIN
    UPDATE books SET sort=title_sort(NEW.title)
    WHERE id=NEW.id AND OLD.title <> NEW.title;
END;
```

**Purpose:** Regenerate sort title only when title changes (optimization)

#### 3. Books Delete Trigger (Lines 148-159, later expanded in 460-473)

```python
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
    DELETE FROM identifiers WHERE book=OLD.id;
END;
```

**Purpose:** Cascade delete all related records when a book is deleted

### Additional Triggers to Research

**Source:** [`src/calibre/db/schema_upgrades.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py)

#### Foreign Key Constraint Triggers (Lines 57-71)

```python
CREATE TRIGGER fkc_delete_on_authors
BEFORE DELETE ON authors
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(id) FROM books_authors_link WHERE author=OLD.id) > 0
        THEN RAISE(ABORT, 'Foreign key violation: authors is still referenced')
    END;
END;
```

**Purpose:** Prevent deletion of authors/tags/series/publishers that are still linked to books

### SQL Function Dependencies

The triggers depend on custom SQL functions being registered:

1. **`title_sort(text)`** - Already implemented in Rust at `persistence.rs:25-38`
2. **`uuid4()`** - May be registered, needs verification
3. **`author_to_author_sort(text)`** - Not yet implemented

**Source:** [`src/calibre/db/backend.py:383-387`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L383-L387)

---

## Planning Phase

### Design Decisions

#### 1. Trigger Registration Approach

**Option A: Register at connection time**
- Pros: Always present, can't be forgotten
- Cons: Need to track schema version to avoid duplicate registration

**Option B: Schema migration system**
- Pros: Proper versioning, idempotent
- Cons: More complex, requires migration infrastructure

**Recommendation:** Option A for now, migrate to Option B in P1 work

#### 2. Where to Register Triggers

**Location:** `src-tauri/libcalibre/src/persistence.rs`

Add new function:
```rust
pub fn register_triggers(conn: &mut Connection) -> Result<(), diesel::result::Error>
```

Call from `establish_connection()` after registering SQL functions.

#### 3. Handling Existing Databases

**Challenge:** Calibre databases may already have these triggers

**Solution:**
```rust
// Drop existing trigger if present (idempotent)
conn.execute("DROP TRIGGER IF EXISTS books_insert_trg")?;
// Create trigger
conn.execute("CREATE TRIGGER books_insert_trg ...")?;
```

#### 4. Testing Strategy

Create test cases:
- Insert book → verify `sort` and `uuid` populated
- Update book title → verify `sort` updated
- Delete book → verify all related records deleted
- Try to delete referenced author → verify error raised

---

## Development Phase

### Implementation Checklist

#### Step 1: Register `uuid4()` SQL Function (if needed)

**File:** `src-tauri/libcalibre/src/persistence.rs`

```rust
// Check if uuid4 is already registered in establish_connection()
// If not, add:
define_sql_function!(fn uuid4() -> Text);
let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());
```

**Verification:**
```bash
cd src-tauri/libcalibre
cargo test --test test_persistence -- --nocapture
```

#### Step 2: Create Trigger Registration Function

**File:** `src-tauri/libcalibre/src/persistence.rs`

```rust
use diesel::prelude::*;

pub fn register_triggers(conn: &mut SqliteConnection) -> Result<(), diesel::result::Error> {
    // Books insert trigger
    conn.execute(
        "DROP TRIGGER IF EXISTS books_insert_trg"
    )?;
    conn.execute(
        "CREATE TRIGGER books_insert_trg AFTER INSERT ON books
         BEGIN
             UPDATE books SET sort=title_sort(NEW.title), uuid=uuid4()
             WHERE id=NEW.id;
         END;"
    )?;

    // Books update trigger
    conn.execute(
        "DROP TRIGGER IF EXISTS books_update_trg"
    )?;
    conn.execute(
        "CREATE TRIGGER books_update_trg AFTER UPDATE ON books
         BEGIN
             UPDATE books SET sort=title_sort(NEW.title)
             WHERE id=NEW.id AND OLD.title <> NEW.title;
         END;"
    )?;

    // Books delete trigger
    conn.execute(
        "DROP TRIGGER IF EXISTS books_delete_trg"
    )?;
    conn.execute(
        "CREATE TRIGGER books_delete_trg AFTER DELETE ON books
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
             DELETE FROM identifiers WHERE book=OLD.id;
         END;"
    )?;

    Ok(())
}
```

#### Step 3: Call from `establish_connection()`

**File:** `src-tauri/libcalibre/src/persistence.rs:40-53`

```rust
pub fn establish_connection(db_path: &str) -> Result<diesel::SqliteConnection, ()> {
    // ... existing code ...
    let _ = title_sort_utils::register_impl(&mut connection, sort_book_title);
    let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());

    // Register triggers
    register_triggers(&mut connection)
        .map_err(|e| eprintln!("Failed to register triggers: {}", e))
        .ok();

    Ok(connection)
}
```

#### Step 4: Remove Manual UUID Fetch Workaround

**File:** `src-tauri/libcalibre/src/api/books.rs:29-45`

Current code:
```rust
let b = diesel::insert_into(books)
    .values(new_book)
    .returning(BookRow::as_returning())
    .get_result(&mut *connection)
    .expect("Error saving new book");

// SQLite doesn't add the UUID until after our `insert_into` call,
// so we need to fetch it from the DB to provide it to the caller.
let mut book_generated = b.clone();
let book_uuid = uuid_for_book(&mut *connection, b.id);
book_generated.uuid = book_uuid;

Ok(book_generated)
```

**After triggers:**
```rust
let book = diesel::insert_into(books)
    .values(new_book)
    .returning(BookRow::as_returning())
    .get_result(&mut *connection)
    .expect("Error saving new book");

// Trigger now auto-populates uuid and sort
Ok(book)
```

Also remove the `uuid_for_book()` helper function (lines 433-441).

#### Step 5: Add Foreign Key Constraint Triggers

**File:** `src-tauri/libcalibre/src/persistence.rs` (in `register_triggers()`)

```rust
// Prevent deletion of referenced authors
conn.execute(
    "DROP TRIGGER IF EXISTS fkc_delete_on_authors"
)?;
conn.execute(
    "CREATE TRIGGER fkc_delete_on_authors
     BEFORE DELETE ON authors
     BEGIN
         SELECT CASE
             WHEN (SELECT COUNT(id) FROM books_authors_link WHERE author=OLD.id) > 0
             THEN RAISE(ABORT, 'Foreign key violation: authors is still referenced')
         END;
     END;"
)?;

// Repeat for tags, series, publishers, ratings
// (See Calibre schema_upgrades.py:57-71 for exact patterns)
```

#### Step 6: Write Tests

**File:** `src-tauri/libcalibre/tests/test_triggers.rs` (new file)

```rust
#[cfg(test)]
mod tests {
    use libcalibre::*;
    use tempfile::tempdir;

    #[test]
    fn test_books_insert_trigger_generates_sort_and_uuid() {
        // Arrange
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        // ... setup test DB ...

        let mut client = ClientV2::new(db_path);

        // Act
        let book = client.books().create(NewBook {
            title: "The Great Book".to_string(),
            // ... other fields ...
        }).unwrap();

        // Assert
        assert_eq!(book.sort, Some("Great Book, The".to_string()));
        assert!(book.uuid.is_some());
        assert!(book.uuid.unwrap().len() == 36); // UUID format
    }

    #[test]
    fn test_books_update_trigger_updates_sort() {
        // Test that changing title updates sort field
    }

    #[test]
    fn test_books_delete_trigger_cascades() {
        // Create book with authors, comments, identifiers, files
        // Delete book
        // Verify all related records deleted
    }

    #[test]
    fn test_foreign_key_constraint_prevents_author_delete() {
        // Create author with linked books
        // Attempt to delete author
        // Verify error raised
    }
}
```

---

## Acceptance Criteria

- [ ] `books_insert_trg` registered and fires on INSERT
- [ ] `books_update_trg` registered and fires on UPDATE (only when title changes)
- [ ] `books_delete_trg` registered and cascades to all related tables
- [ ] Foreign key constraint triggers prevent deletion of referenced entities
- [ ] New books automatically have `sort` and `uuid` populated
- [ ] Manual UUID fetch workaround removed from `api/books.rs`
- [ ] All tests pass
- [ ] Works with existing Calibre databases (idempotent trigger registration)
- [ ] No breaking changes to public API

---

## Testing Instructions

### Manual Testing

```bash
# 1. Create a new book
cd src-tauri
cargo test --test integration_tests -- create_book

# 2. Check DB directly
sqlite3 path/to/test/metadata.db
SELECT id, title, sort, uuid FROM books WHERE title='Test Book';
# Verify sort = "Test Book, The" and uuid is present

# 3. Update book title
cargo test --test integration_tests -- update_book_title

# 4. Check sort updated
SELECT id, title, sort FROM books WHERE id=1;

# 5. Delete book and verify cascade
DELETE FROM books WHERE id=1;
SELECT COUNT(*) FROM books_authors_link WHERE book=1;  -- Should be 0
SELECT COUNT(*) FROM data WHERE book=1;                 -- Should be 0
```

### Automated Testing

```bash
cd src-tauri/libcalibre
cargo test test_triggers
```

---

## References

- [Calibre Schema Upgrades](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/schema_upgrades.py)
- [Calibre Backend](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py)
- [SQLite Trigger Documentation](https://www.sqlite.org/lang_createtrigger.html)
- Current implementation: `src-tauri/libcalibre/src/api/books.rs`
- Current SQL functions: `src-tauri/libcalibre/src/persistence.rs`

---

## Follow-up Issues

- [ ] P1-01: Implement `last_modified` auto-update trigger
- [ ] P1-02: Schema versioning system (check PRAGMA user_version before registering)
- [ ] P2-03: Transaction management for multi-step operations
