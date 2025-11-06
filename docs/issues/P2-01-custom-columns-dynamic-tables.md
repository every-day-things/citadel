# P2-01: Implement Dynamic Custom Columns

**Priority:** P2 (Medium)
**Estimated Effort:** 1-2 weeks
**Dependencies:** P0-01 (Triggers), P1-01 (Schema Versioning)
**Labels:** `database`, `feature`, `security`

---

## Problem Statement

libcalibre has a hard-coded "read" custom column with SQL injection vulnerabilities. Calibre supports dynamic custom columns of many datatypes that can be added by users. This is a critical feature for power users.

**Current Issues:**
1. **Hard-coded single column** - Only "read" state supported
2. **SQL injection risk** - String formatting in queries (`api/books.rs:263-264, 279-280, 302-303`)
3. **No general API** - Can't add/remove/list custom columns
4. **No datatype support** - Only bool implemented

**Reference:** `src-tauri/libcalibre/src/api/books.rs:233-310`

---

## Research Phase

### Study Calibre's Custom Columns

**Source:** [`src/calibre/library/custom_columns.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/library/custom_columns.py)

#### Custom Columns Table

**Schema:** `src-tauri/libcalibre/src/schema.rs:62-73`

```sql
CREATE TABLE custom_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,          -- e.g., "myrating"
    name TEXT NOT NULL,                  -- e.g., "My Rating"
    datatype TEXT NOT NULL,              -- text, series, bool, int, float, etc.
    mark_for_delete BOOL DEFAULT 0,
    editable BOOL DEFAULT 1,
    display TEXT DEFAULT "{}",           -- JSON config
    is_multiple BOOL DEFAULT 0,          -- Can have multiple values?
    normalized BOOL NOT NULL            -- Needs separate table?
);
```

#### Supported Datatypes

**From Calibre:**
- `text` - Single/multiple text values
- `series` - Series with index
- `enumeration` - Fixed set of values
- `datetime` - Date/timestamp
- `float` - Decimal numbers
- `int` - Integers
- `bool` - True/False
- `rating` - 0-10 star rating
- `comments` - Long text/HTML
- `composite` - Computed from template

#### Dynamic Table Creation

**Pattern 1: Normalized Fields (is_multiple=True or datatype needs normalization)**

Creates TWO tables:
```sql
-- Value table
CREATE TABLE custom_column_1 (
    id INTEGER PRIMARY KEY,
    value {TYPE} NOT NULL UNIQUE
);

-- Link table
CREATE TABLE books_custom_column_1_link (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL,
    value INTEGER NOT NULL,
    UNIQUE(book, value)
);
```

**Pattern 2: Simple Fields (is_multiple=False, simple datatypes)**

Creates ONE table:
```sql
CREATE TABLE custom_column_2 (
    id INTEGER PRIMARY KEY,
    book INTEGER NOT NULL UNIQUE,
    value {TYPE} NOT NULL
);
```

#### Type Mapping

```python
TYPE_MAPPING = {
    'text': 'TEXT',
    'int': 'INTEGER',
    'float': 'REAL',
    'datetime': 'TIMESTAMP',
    'bool': 'INTEGER',  # 0 or 1
    'rating': 'INTEGER', # 0-10
    'comments': 'TEXT',
}
```

### SQL Injection in Current Implementation

**Vulnerable Code:** `src-tauri/libcalibre/src/api/books.rs:279-280`

```rust
sql_query(format!(
    "SELECT value FROM custom_column_{read_state_column_id} WHERE book = ?"
))
.bind::<Integer, _>(book_id)
```

**Issue:** `read_state_column_id` is an integer from database - SAFE
**But:** Pattern dangerous if applied to other contexts

**Actually Safe:** The current code is OK because column IDs are integers
**Risk:** Template for future code that might use strings

---

## Planning Phase

### Design Decisions

#### 1. API Design

**CRUD for Custom Columns:**
```rust
pub trait CustomColumnsHandler {
    fn create_column(spec: CustomColumnSpec) -> Result<i32>;
    fn get_column(column_id: i32) -> Result<CustomColumn>;
    fn list_columns() -> Result<Vec<CustomColumn>>;
    fn delete_column(column_id: i32) -> Result<()>;

    // Value operations
    fn set_value(column_id: i32, book_id: i32, value: Value) -> Result<()>;
    fn get_value(column_id: i32, book_id: i32) -> Result<Option<Value>>;
}
```

#### 2. Safe SQL Generation

**Approach:** Use parameterized queries with validated identifiers

**Validation:**
```rust
fn validate_column_id(id: i32) -> Result<i32> {
    // Verify column exists in custom_columns table
    // Return validated ID for use in query
}

fn get_column_table_name(validated_id: i32) -> String {
    format!("custom_column_{}", validated_id) // Safe: id is validated integer
}
```

#### 3. Datatype Support Priority

**Phase 1 (P2):**
- ✅ bool (already implemented)
- ✅ text (simple)
- ✅ int
- ✅ float

**Phase 2 (P3):**
- datetime
- rating
- comments
- enumeration

**Phase 3 (Future):**
- series
- composite (computed fields)

#### 4. Dynamic Table Creation Strategy

**Challenge:** Diesel ORM uses static schema

**Approach:**
- Use raw SQL for custom column tables
- Don't include in `schema.rs`
- Access via `diesel::sql_query()`

**Example:**
```rust
fn create_custom_column_table(
    conn: &mut Connection,
    column_id: i32,
    datatype: &str,
    is_multiple: bool,
) -> Result<()> {
    let table_name = format!("custom_column_{}", column_id);
    let sql_type = datatype_to_sql(datatype)?;

    if is_multiple {
        // Create value table + link table
        conn.execute(&format!(
            "CREATE TABLE {} (
                id INTEGER PRIMARY KEY,
                value {} NOT NULL UNIQUE
            )",
            table_name, sql_type
        ))?;

        conn.execute(&format!(
            "CREATE TABLE books_{}_link (
                id INTEGER PRIMARY KEY,
                book INTEGER NOT NULL,
                value INTEGER NOT NULL,
                UNIQUE(book, value)
            )",
            table_name
        ))?;
    } else {
        // Create simple table
        conn.execute(&format!(
            "CREATE TABLE {} (
                id INTEGER PRIMARY KEY,
                book INTEGER NOT NULL UNIQUE,
                value {} NOT NULL
            )",
            table_name, sql_type
        ))?;
    }

    Ok(())
}
```

---

## Development Phase

### Task Breakdown

#### 1. Fix SQL Injection Risk in Current Code

**Location:** `src-tauri/libcalibre/src/api/books.rs:233-310`

**Changes:**
- Add validation of `read_state_column_id`
- Add comments explaining why integer formatting is safe
- Extract to helper function for reuse

#### 2. Create Custom Columns API Module

**Location:** `src-tauri/libcalibre/src/api/custom_columns.rs` (new file)

**Implement:**
- `CustomColumnsHandler` struct
- `create_column()` - Insert into custom_columns, create tables
- `get_column()` - Read metadata
- `list_columns()` - All custom columns
- `delete_column()` - Remove from custom_columns, drop tables
- `set_value()` - Insert/update value
- `get_value()` - Read value

#### 3. Implement Safe Table Name Generation

**Location:** `src-tauri/libcalibre/src/api/custom_columns.rs`

**Functions:**
- `validate_column_id(id)` - Verify exists in custom_columns
- `get_table_name(validated_id)` - Generate table name
- `datatype_to_sql(datatype)` - Map to SQL type
- Always use validated IDs in SQL

#### 4. Implement Datatype Support

**Phase 1 Datatypes:**
- `bool` → SQL INTEGER (0/1)
- `text` → SQL TEXT
- `int` → SQL INTEGER
- `float` → SQL REAL

**Value Enum:**
```rust
pub enum CustomColumnValue {
    Bool(bool),
    Text(String),
    Int(i32),
    Float(f64),
}
```

#### 5. Create/Drop Table Operations

**Create:**
- Check datatype
- Determine if normalized (is_multiple)
- Generate appropriate schema
- Execute CREATE TABLE
- Update custom_columns metadata

**Drop:**
- Verify column exists
- Drop tables (main + link if exists)
- Delete from custom_columns

#### 6. Integrate into CalibreClient

**Location:** `src-tauri/libcalibre/src/calibre_client.rs`

**Add:**
```rust
pub fn custom_columns(&mut self) -> CustomColumnsHandler {
    CustomColumnsHandler::new(Arc::clone(&self.connection))
}
```

#### 7. Migrate Hard-coded "Read" Column

**Strategy:**
- Keep existing API for compatibility
- Implement using new custom columns system
- Ensure "read" column created on first use

#### 8. Testing Strategy

**Unit Tests:**
- Test each datatype
- Test normalized vs simple tables
- Test SQL injection prevention
- Test table creation/deletion

**Integration Tests:**
- Create custom column
- Set/get values for books
- Delete custom column
- Verify Calibre compatibility

---

## Acceptance Criteria

- [ ] Custom columns can be created/deleted dynamically
- [ ] Supports bool, text, int, float datatypes
- [ ] Handles both simple and normalized (is_multiple) columns
- [ ] No SQL injection vulnerabilities
- [ ] Existing "read" column still works
- [ ] Compatible with Calibre custom columns
- [ ] All table names validated
- [ ] Transaction safety for column operations
- [ ] Tests cover all datatypes
- [ ] Clear error messages

---

## Security Review Checklist

- [ ] All column IDs validated before use in SQL
- [ ] No string concatenation for table names (only validated integers)
- [ ] All user input sanitized
- [ ] SQL injection tests pass
- [ ] Parameter binding used for all values
- [ ] Error messages don't leak SQL structure

---

## Testing Instructions

### SQL Injection Tests

```rust
#[test]
fn test_column_id_validation() {
    // Attempt to use non-existent column ID
    // Should fail validation, not cause SQL error
}

#[test]
fn test_no_sql_injection_in_value() {
    // Set value with SQL injection attempt
    let value = "'; DROP TABLE books; --";
    // Should be safely bound as parameter
}
```

### Compatibility Tests

**With Calibre:**
1. Create custom column in libcalibre
2. Open in Calibre
3. Verify column appears
4. Set value in Calibre
5. Read in libcalibre
6. Verify matches

---

## References

- [Calibre Custom Columns](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/library/custom_columns.py)
- [Calibre Field Metadata](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/library/field_metadata.py)
- Current implementation: `src-tauri/libcalibre/src/api/books.rs:233-310`
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

## Follow-up Issues

- [ ] P3-01: Support datetime, rating, comments datatypes
- [ ] P3-02: Support series custom columns
- [ ] P3-03: Support composite (computed) custom columns
- [ ] P3-04: Custom column validation rules
