# P0-05: Improve Filesystem Path Construction for Calibre Compatibility

**Priority:** P0 (Compatibility)
**Estimated Effort:** 3-4 days
**Dependencies:** None
**Labels:** `filesystem`, `compatibility`, `windows`

---

## Problem Statement

libcalibre uses the `sanitise` crate for path construction, which differs from Calibre's custom `ascii_filename()` logic. This causes compatibility issues:

1. **Windows reserved names** not handled (CON, PRN, AUX, etc. → crash on Windows)
2. **Path length** not enforced (can exceed filesystem limits)
3. **Trailing spaces/periods** not stripped (invalid on Windows)
4. **Unicode handling** may differ from Calibre

Current files created by libcalibre may not match Calibre's expected structure.

## Current State

**Path Construction:**
- ✅ Book folders: `{author}/{title} ({id})` - `calibre_client.rs:484-489`
- ✅ File names: `{title} - {author}.{ext}` - `calibre_client.rs:476-482`
- ⚠️ Uses `sanitise()` crate instead of Calibre logic

**Reference:** `src-tauri/libcalibre/src/calibre_client.rs:476-489`

---

## Research Phase

### Study Calibre's Path Construction

**Source:** [`src/calibre/db/backend.py:1507-1527`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L1507-L1527)

#### `construct_path_name()` Function

```python
def construct_path_name(self, book_id, title, author):
    '''
    Construct the directory name for this book based on its metadata.
    '''
    book_id = BOOK_ID_PATH_TEMPLATE.format(book_id)  # " ({id})"
    l = self.PATH_LIMIT - (len(book_id) // 2) - 2
    author = ascii_filename(author)[:l]
    title  = ascii_filename(title.lstrip())[:l].rstrip()
    if not title:
        title = 'Unknown'[:l]
    try:
        while author[-1] in (' ', '.'):
            author = author[:-1]
    except IndexError:
        author = ''
    if not author:
        author = ascii_filename(_('Unknown'))
    if author.upper() in WINDOWS_RESERVED_NAMES:
        author += 'w'
    return f'{author}/{title}{book_id}'
```

**Key Features:**
1. Path length enforcement (`PATH_LIMIT`)
2. Strips leading whitespace from title
3. Strips trailing spaces and periods from author
4. Handles empty title/author
5. Adds 'w' suffix to Windows reserved names
6. Uses `ascii_filename()` for sanitization

#### `ascii_filename()` Function

**Source:** [`src/calibre/utils/filenames.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/utils/filenames.py)

**Algorithm:**
1. **Unicode → ASCII transliteration**
   - "Józef Müller" → "Jozef Muller"
   - Uses unidecode-like mapping

2. **Remove/replace illegal characters**
   - `< > : " / \ | ? *` → replaced with `_`
   - Control characters → removed

3. **Handle Windows specifics**
   - Reserved names checked
   - Trailing dots/spaces removed
   - Path length validated

4. **Handle case-insensitive filesystems**
   - macOS and Windows considerations
   - Ensure unique names

#### Windows Reserved Names

**Source:** [`src/calibre/db/backend.py:81`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L81)

```python
WINDOWS_RESERVED_NAMES = frozenset(
    'CON PRN AUX NUL '
    'COM1 COM2 COM3 COM4 COM5 COM6 COM7 COM8 COM9 '
    'LPT1 LPT2 LPT3 LPT4 LPT5 LPT6 LPT7 LPT8 LPT9'
    .split()
)
```

**Handling:** If author name matches (case-insensitive), append 'w':
- "CON" → "CONw"
- "aux" → "auxw"

#### Path Limits

**Source:** [`src/calibre/constants.py`](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/constants.py)

- Windows: 260 characters total path
- Linux/macOS: 4096 characters (but Calibre uses conservative limit)
- Calibre default: `PATH_LIMIT = 100` for author+title part

**Calculation:**
```
Full path = library_path + "/" + author + "/" + title + " ({id})" + "/" + filename + ".ext"
```

Calibre limits `author` and `title` to ensure total stays under limit.

### Examples from Calibre

**Test Cases:**

| Input | Output |
|-------|--------|
| "John Smith", "The Great Book", 42 | `Smith, John/Great Book (42)/` |
| "Józef Müller", "Über alles", 1 | `Jozef Muller/Uber alles (1)/` |
| "CON", "Test Book", 10 | `CONw/Test Book (10)/` |
| "A" * 200, "B" * 200, 5 | Truncated to PATH_LIMIT |
| "Test ", "Book.", 99 | `Test/Book (99)/` (spaces/dots stripped) |

---

## Planning Phase

### Design Decisions

#### 1. Implementation Approach

**Option A:** Replace `sanitise()` with custom implementation
- Pros: Full control, exact Calibre compatibility
- Cons: More code to maintain

**Option B:** Enhance `sanitise()` with post-processing
- Pros: Leverage existing crate
- Cons: May still differ from Calibre

**Recommendation:** Option A - need exact Calibre behavior for compatibility

#### 2. Where to Implement

**Location:** `src-tauri/libcalibre/src/util.rs` (add functions)

**New Functions Needed:**
- `ascii_filename(input: &str) -> String` - Full Calibre-compatible sanitization
- `construct_book_path(book_id: i32, title: &str, author: &str) -> PathBuf`
- `construct_file_name(title: &str, author: &str, format: &str) -> String`

#### 3. Unicode Transliteration

**Approach:** Use `unidecode` crate (same as Calibre uses)

**Crate:** [`unidecode`](https://crates.io/crates/unidecode)

```toml
[dependencies]
unidecode = "0.3"
```

#### 4. Platform Handling

**Detection:**
- Use `cfg!(target_os = "windows")` for Windows-specific logic
- Path limits vary by platform

**Strategy:**
- Always apply Windows reserved name check (for portability)
- Apply stricter limits for safety

#### 5. Testing Strategy

**Unit Tests:**
- Test each transformation rule
- Test Windows reserved names
- Test Unicode handling
- Test path length enforcement

**Compatibility Tests:**
- Compare output with Calibre for same inputs
- Test with existing Calibre libraries

---

## Development Phase

### Task Breakdown

#### 1. Implement `ascii_filename()`

**Location:** `src-tauri/libcalibre/src/util.rs`

**Requirements:**
- Accept UTF-8 string input
- Transliterate Unicode to ASCII using `unidecode`
- Replace illegal characters: `< > : " / \ | ? *` with `_`
- Remove control characters (ASCII 0-31)
- Strip leading/trailing whitespace
- Return sanitized string

**Edge Cases to Handle:**
- Empty string → "Unknown"
- Only illegal characters → "Unknown"
- Very long strings → truncate

#### 2. Implement `construct_book_path()`

**Location:** `src-tauri/libcalibre/src/util.rs`

**Requirements:**
- Format: `{author}/{title} ({id})`
- Apply `ascii_filename()` to author and title
- Enforce path length limits
- Strip trailing spaces/periods from author
- Check Windows reserved names
- Handle empty author/title

**Constants Needed:**
```rust
const PATH_LIMIT: usize = 100;
const WINDOWS_RESERVED_NAMES: &[&str] = &[
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];
```

#### 3. Implement `construct_file_name()`

**Location:** `src-tauri/libcalibre/src/util.rs`

**Requirements:**
- Format: `{title} - {author}`
- Apply same sanitization as `ascii_filename()`
- Used for book file names (without extension)

#### 4. Update Book Creation to Use New Functions

**Location:** `src-tauri/libcalibre/src/calibre_client.rs:484-489`

**Current:**
```rust
fn gen_book_folder_name(book_name: &String, book_id: i32) -> String {
    sanitise(&"{title} ({id})".replace("{title}", book_name)
                             .replace("{id}", &book_id.to_string()))
}
```

**Replace with:**
```rust
fn gen_book_folder_name(book_name: &String, book_id: i32) -> String {
    // Just return the title part - path construction handled elsewhere
    util::ascii_filename(book_name)
}
```

**And update book path construction to use:**
```rust
let book_path = util::construct_book_path(book.id, &dto.book.title, &primary_author.name);
```

#### 5. Update File Name Construction

**Location:** `src-tauri/libcalibre/src/calibre_client.rs:476-482`

**Replace `gen_book_file_name()` with:**
```rust
fn gen_book_file_name(book_title: &str, author_name: &str) -> String {
    util::construct_file_name(book_title, author_name)
}
```

#### 6. Add Comprehensive Tests

**Location:** `src-tauri/libcalibre/tests/test_path_construction.rs` (new file)

**Test Cases:**
- Unicode transliteration
- Illegal character replacement
- Windows reserved names
- Path length limits
- Empty strings
- Whitespace handling
- Trailing spaces/periods

**Reference Implementation:**
Compare with Calibre's behavior for same inputs

---

## Acceptance Criteria

- [ ] `ascii_filename()` implemented with Unicode transliteration
- [ ] Illegal characters replaced correctly (`< > : " / \ | ? *` → `_`)
- [ ] Windows reserved names handled (append 'w')
- [ ] Path length enforced (PATH_LIMIT)
- [ ] Trailing spaces/periods stripped from author names
- [ ] Empty names default to "Unknown"
- [ ] All edge cases tested
- [ ] Generates same paths as Calibre for standard inputs
- [ ] Works on Windows, Linux, macOS
- [ ] No breaking changes to database schema

---

## Testing Instructions

### Comparison with Calibre

**Setup:**
1. Install Calibre
2. Create test library
3. Add books with various problematic names:
   - Unicode: "Józef Müller" / "Über alles"
   - Reserved: "CON" / "AUX"
   - Long: 200+ character names
   - Special: "Test " / "Book."

**Verify:**
1. Check Calibre's directory structure
2. Run libcalibre with same inputs
3. Compare paths byte-for-byte

### Automated Tests

```bash
cd src-tauri/libcalibre
cargo test test_path_construction
cargo test test_ascii_filename
cargo test test_windows_reserved_names
```

### Manual Windows Testing

**On Windows machine:**
1. Create book with author name "CON"
2. Verify folder created as "CONw"
3. Verify no OS errors

---

## References

- [Calibre Path Construction](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/db/backend.py#L1507-L1527)
- [Calibre ascii_filename](https://github.com/kovidgoyal/calibre/blob/master/src/calibre/utils/filenames.py)
- [Windows Reserved Names](https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
- Current implementation: `src-tauri/libcalibre/src/calibre_client.rs:476-489`
- [unidecode crate](https://crates.io/crates/unidecode)

---

## Follow-up Issues

- [ ] P1-09: Path migration tool for existing libraries
- [ ] P2-16: Handle path collisions (multiple books with same name)
- [ ] P2-17: Case-insensitive filesystem support (macOS, Windows)
