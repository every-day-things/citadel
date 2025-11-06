# P0-02: Register Custom SQL Functions for Calibre Compatibility

**Priority:** P0 (Critical)
**Estimated Effort:** 3-4 days
**Dependencies:** None (but enables P0-01)
**Labels:** `database`, `compatibility`, `sql`

---

## Problem Statement

Calibre uses custom SQL functions for data transformation and computed fields. libcalibre has implemented `title_sort()` in Rust but hasn't registered it with the database. Additionally, `author_to_author_sort()` is not implemented at all. Without these functions:

1. **Triggers can't fire properly** (P0-01 depends on this)
2. **Queries using these functions will fail**
3. **Incompatible with Calibre's expected SQL behavior**

## Current State

- ✅ `title_sort()` implemented in Rust (`persistence.rs:25-38`)
- ✅ `uuid4()` likely registered (needs verification)
- ⚠️ `title_sort()` registered but **NOT tested**
- ❌ `author_to_author_sort()` not implemented

## Research Phase

### Study Calibre's SQL Function Implementation

**Primary Source:** [`src/calibre/db/backend.py:383-391`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L383-L391)

#### SQL Function Registration in Calibre

```python
class Connection(apsw.Connection):
    def __init__(self, path):
        super().__init__(path)
        plugins.load_apsw_extension(self, 'sqlite_extension')

        # Register custom SQL functions
        self.createscalarfunction('title_sort', title_sort, 1)
        self.createscalarfunction('author_to_author_sort',
                _author_to_author_sort, 1)
        self.createscalarfunction('uuid4', lambda: str(uuid.uuid4()), 0)
```

### 1. `title_sort()` Function

**Source:** [`src/calibre/ebooks/metadata/__init__.py:title_sort()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py)

**Algorithm:**
```python
def title_sort(title):
    # Move articles (A, An, The) to the end
    # "The Great Book" → "Great Book, The"
    # "A Tale" → "Tale, A"
    # "An Adventure" → "Adventure, An"
```

**Current libcalibre Implementation:** `src-tauri/libcalibre/src/persistence.rs:25-38`

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

**Issues with Current Implementation:**
1. ⚠️ Only matches at start of string (should be case-insensitive)
2. ⚠️ Doesn't handle Unicode properly
3. ⚠️ Not registered as SQL function (registration exists but untested)

### 2. `author_to_author_sort()` Function

**Source:** [`src/calibre/ebooks/metadata/__init__.py:author_to_author_sort()`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py)

**Full Algorithm from Calibre:**

```python
def author_to_author_sort(author):
    """
    Given a name in "First Last" format, return "Last, First"

    Rules:
    1. If already in "Last, First" format, return as-is
    2. Handle name particles (von, van, de, der, etc.)
    3. Handle suffixes (Jr., Sr., III, IV, etc.)
    4. Handle single names (just return as-is)

    Examples:
    "John Smith" → "Smith, John"
    "Smith, John" → "Smith, John" (unchanged)
    "John von Smith" → "von Smith, John"
    "John Smith Jr." → "Smith, John Jr."
    "Mary-Jane O'Brien" → "O'Brien, Mary-Jane"
    "Madonna" → "Madonna"
    """
```

**Detailed Implementation Notes:**

From Calibre source, the function:
1. Checks if comma is present → already sorted, return as-is
2. Splits name into tokens
3. Identifies particles: von, van, de, der, del, des, du, di, da, le, la, lo, los, las
4. Identifies suffixes: Jr, Sr, III, IV, V, VI, VII, VIII, IX, X, 1st, 2nd, 3rd
5. Handles apostrophes and hyphens in last names
6. Reconstructs as "Last [Particles], First [Suffix]"

**Calibre's Wrapper for SQL:** [`src/calibre/db/backend.py:217-220`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L217-L220)

```python
def _author_to_author_sort(x):
    if not x:
        return ''
    return author_to_author_sort(x.replace('|', ','))
```

Note: Handles pipe-to-comma conversion for legacy Calibre format.

### 3. `uuid4()` Function

**Source:** [`src/calibre/db/backend.py:386-387`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L386-L387)

```python
self.createscalarfunction('uuid4', lambda: str(uuid.uuid4()), 0)
```

Simple: Returns a new UUID v4 string.

**Current libcalibre Implementation:** `src-tauri/libcalibre/src/persistence.rs:44-50`

Appears to be registered already:
```rust
define_sql_function!(fn uuid4() -> Text);
let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());
```

---

## Planning Phase

### Design Decisions

#### 1. Verify `title_sort()` Registration

**Current Status:** Defined and registered but not tested

**Action:**
- Write test to call SQL directly: `SELECT title_sort('The Book')`
- Verify result is `'Book, The'`

#### 2. Implement `author_to_author_sort()` in Rust

**Approach:** Simplified version first, then enhance

**Phase 1 (Minimal):**
- Detect if already in "Last, First" format (has comma)
- If not, move last word to front: "John Smith" → "Smith, John"

**Phase 2 (Enhanced):**
- Handle name particles
- Handle suffixes
- Handle hyphens and apostrophes

**Location:** New function in `src-tauri/libcalibre/src/persistence.rs`

#### 3. Testing Strategy

**Unit Tests:**
- Test Rust functions directly
- Test SQL function calls via diesel

**Integration Tests:**
- Create author with name "John Smith"
- Verify `sort` field = "Smith, John"
- Query with ORDER BY author_to_author_sort(name)

---

## Development Phase

### Implementation Checklist

#### Step 1: Verify and Test `title_sort()` Registration

**File:** `src-tauri/libcalibre/tests/test_sql_functions.rs` (new file)

```rust
#[cfg(test)]
mod tests {
    use diesel::prelude::*;
    use libcalibre::persistence::establish_connection;

    #[test]
    fn test_title_sort_sql_function() {
        // Arrange
        let conn = establish_connection(":memory:").unwrap();

        // Act
        let result: String = diesel::sql_query("SELECT title_sort('The Great Book') as result")
            .get_result::<String>(&conn)
            .unwrap();

        // Assert
        assert_eq!(result, "Great Book, The");
    }

    #[test]
    fn test_title_sort_with_a() {
        let conn = establish_connection(":memory:").unwrap();
        let result: String = diesel::sql_query("SELECT title_sort('A Tale of Two Cities') as result")
            .get_result(&conn)
            .unwrap();
        assert_eq!(result, "Tale of Two Cities, A");
    }

    #[test]
    fn test_title_sort_no_article() {
        let conn = establish_connection(":memory:").unwrap();
        let result: String = diesel::sql_query("SELECT title_sort('War and Peace') as result")
            .get_result(&conn)
            .unwrap();
        assert_eq!(result, "War and Peace");
    }
}
```

**Run:**
```bash
cd src-tauri/libcalibre
cargo test test_title_sort_sql_function
```

If this fails, the registration isn't working.

#### Step 2: Implement `author_to_author_sort()` - Phase 1 (Minimal)

**File:** `src-tauri/libcalibre/src/persistence.rs`

```rust
/// Converts author name from "First Last" to "Last, First" format.
///
/// Examples:
/// - "John Smith" → "Smith, John"
/// - "Smith, John" → "Smith, John" (already sorted)
/// - "Madonna" → "Madonna" (single name)
///
/// Based on Calibre's implementation:
/// https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py
pub fn author_to_author_sort(name: String) -> String {
    let name = name.trim();

    // If empty, return empty
    if name.is_empty() {
        return String::new();
    }

    // If already in "Last, First" format (contains comma), return as-is
    if name.contains(',') {
        return name.to_string();
    }

    // Split by whitespace
    let parts: Vec<&str> = name.split_whitespace().collect();

    // Single name (e.g., "Madonna")
    if parts.len() == 1 {
        return name.to_string();
    }

    // Multiple names: move last word to front
    // "John Smith" → "Smith, John"
    // "John Paul Jones" → "Jones, John Paul"
    let last = parts[parts.len() - 1];
    let first = parts[0..parts.len() - 1].join(" ");

    format!("{}, {}", last, first)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_author_to_author_sort_simple() {
        assert_eq!(author_to_author_sort("John Smith".to_string()), "Smith, John");
    }

    #[test]
    fn test_author_to_author_sort_already_sorted() {
        assert_eq!(author_to_author_sort("Smith, John".to_string()), "Smith, John");
    }

    #[test]
    fn test_author_to_author_sort_single_name() {
        assert_eq!(author_to_author_sort("Madonna".to_string()), "Madonna");
    }

    #[test]
    fn test_author_to_author_sort_multiple_names() {
        assert_eq!(author_to_author_sort("John Paul Jones".to_string()), "Jones, John Paul");
    }

    #[test]
    fn test_author_to_author_sort_empty() {
        assert_eq!(author_to_author_sort("".to_string()), "");
    }
}
```

#### Step 3: Register `author_to_author_sort()` SQL Function

**File:** `src-tauri/libcalibre/src/persistence.rs`

```rust
pub fn establish_connection(db_path: &str) -> Result<diesel::SqliteConnection, ()> {
    // ... existing code ...

    // Register custom SQL functions
    define_sql_function!(fn title_sort(title: Text) -> Text);
    define_sql_function!(fn uuid4() -> Text);
    define_sql_function!(fn author_to_author_sort(name: Text) -> Text);  // NEW

    let mut connection = diesel::SqliteConnection::establish(db_path).or(Err(()))?;

    let _ = title_sort_utils::register_impl(&mut connection, sort_book_title);
    let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());
    let _ = author_to_author_sort_utils::register_impl(&mut connection, author_to_author_sort);  // NEW

    Ok(connection)
}
```

#### Step 4: Test SQL Function Registration

**File:** `src-tauri/libcalibre/tests/test_sql_functions.rs`

```rust
#[test]
fn test_author_to_author_sort_sql_function() {
    let conn = establish_connection(":memory:").unwrap();

    let result: String = diesel::sql_query(
        "SELECT author_to_author_sort('John Smith') as result"
    )
    .get_result(&conn)
    .unwrap();

    assert_eq!(result, "Smith, John");
}

#[test]
fn test_author_to_author_sort_with_pipes() {
    // Calibre legacy format uses pipes instead of commas
    // "John|Smith" should be handled
    let conn = establish_connection(":memory:").unwrap();

    let result: String = diesel::sql_query(
        "SELECT author_to_author_sort(REPLACE('John|Smith', '|', ',')) as result"
    )
    .get_result(&conn)
    .unwrap();

    assert_eq!(result, "John,Smith");  // Already has comma
}
```

#### Step 5: Enhance `author_to_author_sort()` - Phase 2 (Optional for P0)

**File:** `src-tauri/libcalibre/src/persistence.rs`

Add support for:

```rust
// Name particles that stay with last name
const PARTICLES: &[&str] = &[
    "von", "van", "de", "der", "del", "des", "du",
    "di", "da", "le", "la", "lo", "los", "las"
];

// Suffixes that go after first name
const SUFFIXES: &[&str] = &[
    "jr", "jr.", "sr", "sr.",
    "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
    "1st", "2nd", "3rd", "2d", "3d"
];

pub fn author_to_author_sort(name: String) -> String {
    let name = name.trim();

    if name.is_empty() {
        return String::new();
    }

    if name.contains(',') {
        return name.to_string();
    }

    let parts: Vec<&str> = name.split_whitespace().collect();

    if parts.len() == 1 {
        return name.to_string();
    }

    // Find suffix
    let mut suffix = String::new();
    let mut working_parts = parts.clone();

    if let Some(last) = working_parts.last() {
        if SUFFIXES.contains(&last.to_lowercase().as_str()) {
            suffix = last.to_string();
            working_parts.pop();
        }
    }

    // Find particles
    let mut particle_start = working_parts.len() - 1;
    for i in (0..working_parts.len()-1).rev() {
        if PARTICLES.contains(&working_parts[i].to_lowercase().as_str()) {
            particle_start = i;
        } else {
            break;
        }
    }

    // Split into first name and last name (with particles)
    let first_parts = &working_parts[0..particle_start];
    let last_parts = &working_parts[particle_start..];

    let first = first_parts.join(" ");
    let last = last_parts.join(" ");

    if suffix.is_empty() {
        format!("{}, {}", last, first)
    } else {
        format!("{}, {} {}", last, first, suffix)
    }
}

#[cfg(test)]
mod tests_enhanced {
    use super::*;

    #[test]
    fn test_particle() {
        assert_eq!(
            author_to_author_sort("John von Smith".to_string()),
            "von Smith, John"
        );
    }

    #[test]
    fn test_suffix() {
        assert_eq!(
            author_to_author_sort("John Smith Jr.".to_string()),
            "Smith, John Jr."
        );
    }

    #[test]
    fn test_particle_and_suffix() {
        assert_eq!(
            author_to_author_sort("John von Smith Jr.".to_string()),
            "von Smith, John Jr."
        );
    }
}
```

#### Step 6: Integration Testing with Authors Table

**File:** `src-tauri/libcalibre/tests/test_author_integration.rs`

```rust
#[test]
fn test_author_sort_auto_generation() {
    // This test will work after P0-01 triggers are implemented
    let mut client = setup_test_client();

    let author = client.authors().create(NewAuthorDto {
        full_name: "John Smith".to_string(),
        sortable_name: "".to_string(),  // Empty, should auto-generate
        external_url: None,
    }).unwrap();

    // With author_to_author_sort() function and triggers,
    // sort should be auto-generated
    assert_eq!(author.sort, Some("Smith, John".to_string()));
}
```

---

## Acceptance Criteria

- [ ] `title_sort()` SQL function verified working via SQL queries
- [ ] `author_to_author_sort()` implemented in Rust (at least Phase 1)
- [ ] `author_to_author_sort()` registered as SQL function
- [ ] All unit tests pass (Rust functions)
- [ ] All SQL function tests pass (diesel queries)
- [ ] `uuid4()` function verified working
- [ ] Functions accessible from triggers (enables P0-01)
- [ ] No breaking changes to existing API

---

## Testing Instructions

### Unit Tests

```bash
cd src-tauri/libcalibre
cargo test persistence::tests
cargo test test_sql_functions
```

### Manual SQL Testing

```bash
# Open test database
sqlite3 /path/to/test/metadata.db

# Test title_sort
SELECT title_sort('The Great Book');
-- Expected: Great Book, The

# Test author_to_author_sort
SELECT author_to_author_sort('John Smith');
-- Expected: Smith, John

# Test uuid4
SELECT uuid4();
-- Expected: something like "550e8400-e29b-41d4-a716-446655440000"
```

### Integration Test

```bash
cd src-tauri
cargo test --test integration_tests -- author_sort
```

---

## References

- [Calibre Metadata Author Sort](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py)
- [Calibre Backend SQL Functions](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L383-L391)
- [Diesel Custom SQL Functions](https://docs.diesel.rs/master/diesel/macro.define_sql_function.html)
- Current implementation: `src-tauri/libcalibre/src/persistence.rs`

---

## Follow-up Issues

- [ ] P1-08: Enhance `author_to_author_sort()` with full Calibre compatibility (particles, suffixes, etc.)
- [ ] P0-01: Database triggers (depends on this issue)
- [ ] P2-13: Apply `author_to_author_sort()` on author creation/update in application code
