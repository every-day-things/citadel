# libcalibre Architecture Analysis & Proposal

## Executive Summary

After analyzing Calibre's Python implementation, Rust database patterns, and existing libcalibre code, I recommend a **hybrid facade pattern with query modules** that balances ergonomics, performance, and testability.

---

## Research Findings

### 1. Calibre's Python Architecture

**Pattern**: In-memory cache with lock-based concurrency

```python
class Cache:
    @read_api   # Automatic read lock
    def get_metadata(self, book_id):
        # Thread-safe access

    @write_api  # Automatic write lock
    def set_metadata(self, book_id, metadata):
        # Thread-safe mutation
```

**Key Insights**:
- **Single cache instance** per library (matches pycalibre's `with Library(path)`)
- **~150+ methods** exposed on Cache class (books, authors, formats, search, FTS)
- **Lock decorators** for automatic concurrency control
- **Lazy proxies** defer expensive operations until needed
- **Event system** for reactive updates (not applicable to Rust lib)

**Strength**: Simple API (`cache.get_metadata(id)`)
**Weakness**: Monolithic class, hard to test individual components

---

### 2. Rust Database Patterns

#### **A. Query Builder Pattern** (Diesel - our current choice)

```rust
// Type-safe, compile-time checked
books::table
    .filter(id.eq(123))
    .select(Book::as_select())
    .load(&mut conn)?
```

**Pros**:
- Compile-time SQL verification
- Type-safe query construction
- Prevents SQL injection by design
- Great error messages

**Cons**:
- More verbose than raw SQL
- Learning curve for DSL
- Some complex queries awkward to express

#### **B. Repository Pattern** (Abstraction layer)

```rust
trait BookRepository {
    fn find(&mut self, id: BookId) -> Result<Option<Book>>;
    fn list(&mut self) -> Result<Vec<Book>>;
}

struct DieselBookRepository {
    conn: SqliteConnection,
}
```

**Pros**:
- Mockable for testing
- Swappable implementations
- Clear separation of concerns
- Domain-driven design friendly

**Cons**:
- Trait objects have runtime cost
- Generic lifetime complexity
- Over-abstraction for single DB
- More boilerplate

#### **C. Active Record Pattern** (SeaORM style)

```rust
let book = Book::find_by_id(123).one(&conn)?;
book.update(&conn)?;
```

**Pros**:
- Very ergonomic
- Less boilerplate
- Familiar to Rails developers

**Cons**:
- Tight coupling (model + persistence)
- Hard to test (models know about DB)
- Not idiomatic Rust
- Violates single responsibility

#### **D. Module Functions** (Current Phase 2)

```rust
let book = books::find(&mut conn, BookId(123))?;
books::update(&mut conn, id, data)?;
```

**Pros**:
- **Idiomatic Rust** (modules, not classes)
- Simple, direct, testable
- No trait overhead
- Easy to understand

**Cons**:
- Must pass connection everywhere
- No encapsulation of connection
- Verbose for repeated operations

---

## Current libcalibre State

### What We Have

```
Phase 1: Type-safe IDs + unified errors ✅
Phase 2: Query modules (books, authors, identifiers) ✅

Current structure:
├── queries/
│   ├── books.rs      - books::find(), books::list(), etc.
│   ├── authors.rs    - authors::find(), authors::list()
│   └── identifiers.rs
├── api/              - OLD handler pattern (Arc<Mutex<>>)
│   ├── books.rs      - BooksHandler
│   └── authors.rs    - AuthorsHandler
└── calibre_client.rs - High-level client (uses handlers)
```

### How citadel Uses It

```rust
// State holds single instance
pub struct CitadelState {
    client: Mutex<Option<CalibreClient>>,
}

// Usage
state.with_client(|client| {
    client.find_all()  // Batch load all books
})
```

**Pattern**: Single instance with interior mutability (Mutex)

---

## Architectural Options

### **Option A: Pure Module Functions** (Status Quo + Remove Old API)

```rust
// User manually manages connection
let mut conn = establish_connection(path)?;
let book = books::find(&mut conn, BookId(123))?;
let authors = authors::list(&mut conn)?;
```

**Pros**:
- ✅ Zero abstraction overhead
- ✅ Testable (inject in-memory conn)
- ✅ Flexible (user controls connection)
- ✅ Simple implementation

**Cons**:
- ❌ Verbose (pass `&mut conn` everywhere)
- ❌ No connection pooling support
- ❌ User must manage connection lifecycle
- ❌ Doesn't match pycalibre/citadel pattern

**Best for**: Advanced users, low-level control

---

### **Option B: Facade Struct** (Recommended)

```rust
pub struct Library {
    conn: SqliteConnection,
    root: PathBuf,
}

impl Library {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> { ... }

    // Facade methods delegate to query modules
    pub fn find_book(&mut self, id: BookId) -> Result<Option<Book>> {
        books::find(&mut self.conn, id)
    }

    pub fn list_books(&mut self) -> Result<Vec<Book>> {
        books::list(&mut self.conn)
    }

    pub fn search_books(&mut self, query: &str) -> Result<Vec<Book>> {
        // Complex logic here
    }
}
```

**Pros**:
- ✅ **Ergonomic** (`lib.find_book(id)` vs `books::find(&mut conn, id)`)
- ✅ **Encapsulates connection** (user doesn't manage it)
- ✅ **Matches pycalibre/citadel** (single instance pattern)
- ✅ **Both APIs available** (facade OR modules for power users)
- ✅ **Easy to add features** (caching, connection pooling)

**Cons**:
- ⚠️ Thin wrapper (but minimal overhead)
- ⚠️ Two ways to do things (but both valid)

**Best for**: General use, matches ecosystem conventions

---

### **Option C: Connection Pool** (Future consideration)

```rust
pub struct Library {
    pool: Pool<SqliteConnection>,  // r2d2 or deadpool
    root: PathBuf,
}

impl Library {
    pub fn find_book(&self, id: BookId) -> Result<Option<Book>> {
        let mut conn = self.pool.get()?;
        books::find(&mut conn, id)
    }
}
```

**Pros**:
- ✅ Thread-safe without Mutex
- ✅ Multiple concurrent readers
- ✅ Handles connection failures

**Cons**:
- ❌ **SQLite WAL mode required** for concurrent access
- ❌ Complexity (pool config, sizing)
- ❌ **Not needed yet** (citadel is single-threaded per library)

**Best for**: Server applications, future consideration

---

### **Option D: Repository Traits** (Over-engineered)

```rust
trait BookRepository {
    fn find(&mut self, id: BookId) -> Result<Option<Book>>;
}

struct SqliteBookRepository { conn: SqliteConnection }
struct MockBookRepository { data: HashMap<BookId, Book> }
```

**Pros**:
- ✅ Testable with mocks
- ✅ Swappable backends

**Cons**:
- ❌ **Over-abstraction** (we only have SQLite)
- ❌ Trait object overhead or generic complexity
- ❌ More boilerplate
- ❌ Not idiomatic for single backend

**Best for**: Multiple database backends (not our case)

---

## Recommendation: **Option B - Facade Pattern**

### Rationale

1. **Matches ecosystem conventions**: pycalibre, citadel both use single instance
2. **Best ergonomics**: `library.find_book(id)` vs `books::find(&mut conn, id)`
3. **Flexibility**: Power users can still use query modules directly
4. **Future-proof**: Easy to add caching, pooling, FTS later
5. **Rust-idiomatic**: Struct methods, not trait overhead

### Proposed Implementation

```rust
/// Main entry point for working with a Calibre library.
///
/// Manages the database connection and provides high-level operations
/// for books, authors, and metadata.
///
/// # Example
///
/// ```
/// use libcalibre::Library;
///
/// let mut library = Library::open("/path/to/library")?;
/// let books = library.search_books("rust programming")?;
/// ```
pub struct Library {
    conn: SqliteConnection,
    root: PathBuf,
}

impl Library {
    // === Lifecycle ===

    /// Open an existing Calibre library.
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let root = path.as_ref().to_path_buf();
        let db_path = root.join("metadata.db");
        let conn = establish_connection(&db_path)?;
        Ok(Self { conn, root })
    }

    /// Get the library root path.
    pub fn root(&self) -> &Path {
        &self.root
    }

    // === Books ===

    /// Find a book by its ID.
    pub fn find_book(&mut self, id: BookId) -> Result<Option<Book>> {
        books::find(&mut self.conn, id)
    }

    /// List all books (consider using `iter_books()` for large libraries).
    pub fn list_books(&mut self) -> Result<Vec<Book>> {
        books::list(&mut self.conn)
    }

    /// Search books by title, author, or content (FTS).
    pub fn search_books(&mut self, query: &str) -> Result<Vec<Book>> {
        // TODO: Implement FTS search
        todo!()
    }

    /// Create a new book with authors and files.
    pub fn add_book(&mut self, builder: BookBuilder) -> Result<Book> {
        // Delegates to complex creation logic
        todo!()
    }

    /// Update a book's metadata.
    pub fn update_book(&mut self, id: BookId, updates: BookUpdates) -> Result<Book> {
        // Handle partial updates
        todo!()
    }

    /// Delete a book and its files.
    pub fn delete_book(&mut self, id: BookId) -> Result<()> {
        books::delete(&mut self.conn, id)?;
        // TODO: Delete files from disk
        Ok(())
    }

    // === Authors ===

    /// Find an author by ID.
    pub fn find_author(&mut self, id: AuthorId) -> Result<Option<Author>> {
        authors::find(&mut self.conn, id)
    }

    /// Search authors by name.
    pub fn search_authors(&mut self, name: &str) -> Result<Vec<Author>> {
        // TODO: Implement fuzzy search
        todo!()
    }

    /// List all authors.
    pub fn list_authors(&mut self) -> Result<Vec<Author>> {
        authors::list(&mut self.conn)
    }

    /// Get books by an author.
    pub fn books_by_author(&mut self, id: AuthorId) -> Result<Vec<BookId>> {
        authors::find_books(&mut self.conn, id)
    }

    // === Low-level access ===

    /// Get direct access to the database connection for advanced operations.
    ///
    /// This allows using query modules directly:
    ///
    /// ```
    /// library.with_connection(|conn| {
    ///     books::batch_get_descriptions(conn, &book_ids)
    /// })?;
    /// ```
    pub fn with_connection<F, R>(&mut self, f: F) -> R
    where
        F: FnOnce(&mut SqliteConnection) -> R,
    {
        f(&mut self.conn)
    }
}
```

### Migration Path

**Phase 3**: Implement `Library` struct
- Keep query modules (already done)
- Add facade methods
- Deprecate old handler API

**Phase 4**: Builder pattern for book creation
- `BookBuilder` for complex creation
- Replace DTOs with builders

**Phase 5**: Advanced features
- Full-text search
- Connection pooling (if needed)
- Caching layer (if needed)

---

## Comparison Matrix

| Feature | Module Functions | Facade Struct | Repository Traits | Connection Pool |
|---------|-----------------|---------------|-------------------|-----------------|
| **Ergonomics** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Testability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Flexibility** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Matches citadel** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Future-proof** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Winner**: **Facade Struct** (balanced best-in-class across all criteria)

---

## Implementation Strategy

### What to Build

```rust
// Keep everything we have:
pub mod queries {
    pub mod books { ... }     // ✅ Already done
    pub mod authors { ... }   // ✅ Already done
    pub mod identifiers { ... } // ✅ Already done
}

// Add new facade:
pub struct Library { ... }    // NEW - Phase 3

impl Library {
    // Delegates to query modules
    pub fn find_book(&mut self, id: BookId) -> Result<Option<Book>> {
        queries::books::find(&mut self.conn, id)
    }
}
```

### What to Deprecate

```rust
// Mark as deprecated (remove later):
#[deprecated(since = "0.4.0", note = "use Library struct instead")]
pub struct CalibreClient { ... }

#[deprecated(since = "0.4.0", note = "use queries::books module instead")]
pub struct BooksHandler { ... }
```

### Citadel Migration

```rust
// Before:
pub struct CitadelState {
    client: Mutex<Option<CalibreClient>>,
}

// After:
pub struct CitadelState {
    library: Mutex<Option<Library>>,
}

// Usage stays the same:
state.with_library(|lib| {
    lib.list_books()
})
```

---

## Conclusion

**Recommendation: Facade Pattern** with query modules underneath.

**Why**:
1. ✅ Matches pycalibre and citadel patterns
2. ✅ Best ergonomics for common use cases
3. ✅ Power users can use query modules directly
4. ✅ Easy to extend with caching, pooling, FTS
5. ✅ Idiomatic Rust (no trait overhead)
6. ✅ Fully tested foundations already in place

**Next Steps**:
- Implement `Library` struct with facade methods
- Add builder pattern for book creation
- Deprecate old handler API
- Update citadel to use `Library`
