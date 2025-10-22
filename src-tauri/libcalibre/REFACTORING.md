# libcalibre Refactoring: Foundations for Idiomatic Rust

## Overview

This document outlines the foundation work for refactoring `libcalibre` from a DDD-inspired architecture to an **idiomatic Rust** implementation. The goal is to make the codebase more maintainable, testable, and aligned with Rust best practices.

## Phase 1: Foundations (Completed)

### 1. Type-Safe ID Wrappers (`src/types.rs`)

**Problem**: Using raw `i32` for all IDs makes it easy to accidentally mix up book IDs, author IDs, etc.

**Solution**: Type-safe newtype wrappers with convenient conversions:

```rust
pub struct BookId(pub i32);
pub struct AuthorId(pub i32);
pub struct BookFileId(pub i32);
pub struct IdentifierId(pub i32);
```

**Features**:
- ✅ `Display`: Formats as `"book_123"`, `"author_456"`, etc.
- ✅ `FromStr`: Parses both `"book_123"` and `"123"`
- ✅ `From<i32>` / `Into<i32>`: Seamless conversion
- ✅ `PartialEq`, `Eq`, `Hash`: Full equality and hashing support
- ✅ Comprehensive unit tests (40+ test cases)

**Benefits**:
- **Type safety**: Can't accidentally pass an `AuthorId` where a `BookId` is expected
- **Better errors**: Error messages show `"book_123"` instead of `123`
- **API clarity**: Function signatures are self-documenting

### 2. Unified Error Type (`src/error.rs`)

**Problem**: Mix of `Result<T, ()>` and `CalibreError` with poor error context.

**Solution**: Single `Error` enum with type-safe variants:

```rust
pub enum Error {
    Database(diesel::result::Error),
    Io(std::io::Error),
    BookNotFound(BookId),
    AuthorNotFound(AuthorId),
    BookFileNotFound(BookFileId),
    IdentifierNotFound(IdentifierId),
    AuthorHasBooks(AuthorId, usize),
    LibraryNotInitialized(String),
    ParseId(ParseIntError),
    CoverExtraction(String),
    Unknown(String),
}

pub type Result<T> = std::result::Result<T, Error>;
```

**Features**:
- ✅ Automatic conversions via `#[from]` for `diesel::Error`, `io::Error`, `ParseIntError`
- ✅ Descriptive error messages using ID types
- ✅ Backwards-compatible alias: `CalibreError = Error`
- ✅ Comprehensive error tests (10+ test cases)

**Benefits**:
- **Better errors**: `"book not found: book_123"` instead of `()`
- **Pattern matching**: Can handle different error types specifically
- **Automatic conversions**: `diesel::Error` auto-converts to `Error::Database`

### 3. Test Infrastructure

**Problem**: Zero tests, making refactoring risky and development slower.

**Solution**: Comprehensive test infrastructure with in-memory SQLite.

#### Unit Tests (Inline)
- **`types.rs`**: 40+ tests for ID parsing, display, conversions, hashing
- **`error.rs`**: 10+ tests for error display, conversions, helpers

#### Test Utilities (`src/test_utils.rs`)
```rust
pub struct TestFixtures {
    // Creates in-memory SQLite with minimal Calibre schema
    pub fn new() -> Self;

    // Fixture builders
    pub fn create_author(&mut self, name: &str) -> AuthorId;
    pub fn create_book(&mut self, title: &str) -> BookId;
    pub fn create_book_with_author(&mut self, title: &str, author: &str) -> (BookId, AuthorId);
    pub fn link_author_to_book(&mut self, book: BookId, author: AuthorId);
    pub fn set_description(&mut self, book: BookId, desc: &str);
    pub fn add_identifier(&mut self, book: BookId, type: &str, val: &str);
}
```

#### Integration Tests (`tests/`)
- **`common/mod.rs`**: Shared test utilities
- **`basic_operations.rs`**: 15+ integration tests covering:
  - Create/read/update/delete operations
  - Author-book relationships
  - Descriptions and identifiers
  - Multiple authors per book
  - Constraint validation

**Benefits**:
- **Fast tests**: In-memory SQLite (~milliseconds per test)
- **Isolated tests**: Each test gets fresh database
- **Easy fixtures**: Simple API for creating test data
- **Regression prevention**: Tests catch breaking changes

## Test Coverage Summary

| Component | Test Type | Count | Coverage |
|-----------|-----------|-------|----------|
| ID Types | Unit | 40+ | Display, parsing, conversions, hashing, roundtrip |
| Error Types | Unit | 10+ | Display, conversions, helpers, Send/Sync |
| Test Fixtures | Unit | 5+ | Author, book, links, descriptions, identifiers |
| CRUD Operations | Integration | 15+ | Create, read, update, delete, relationships |
| **Total** | | **70+** | **Core foundations fully tested** |

## Running Tests

```bash
# Run all tests
cargo test -p libcalibre

# Run only unit tests
cargo test -p libcalibre --lib

# Run only integration tests
cargo test -p libcalibre --test basic_operations

# Run specific test
cargo test -p libcalibre book_id_roundtrip
```

## Migration Strategy

These foundations are **non-breaking** for existing code:
- ✅ Old `CalibreError` still works (deprecated alias)
- ✅ ID types are exported but not yet used in APIs
- ✅ Test infrastructure is separate from production code

### Next Steps

1. **Replace `Result<T, ()>` with `Result<T>`** in handler methods
2. **Add ID types to function signatures** (e.g., `find_by_id(BookId)`)
3. **Create module-based API** (`books::find`, `authors::list`)
4. **Remove Arc/Mutex** - pass `&mut SqliteConnection` directly
5. **Add Builder pattern** to replace DTOs
6. **Implement iterators** for `list()` operations
7. **Create `Library` struct** as main entry point

## Design Principles

This refactoring follows these Rust idioms:

1. **Type safety over convenience**: Use newtypes to prevent errors
2. **Explicit over implicit**: Clear error types, no `()`
3. **Composition over inheritance**: Modules, not classes
4. **Ownership over sharing**: Pass connections, don't share with Arc/Mutex
5. **Tests as documentation**: Every feature has test examples

## Files Created/Modified

### New Files
- `src/types.rs` - Type-safe ID wrappers with tests
- `src/test_utils.rs` - Test fixture builders
- `tests/common/mod.rs` - Integration test helpers
- `tests/basic_operations.rs` - CRUD integration tests
- `REFACTORING.md` - This document

### Modified Files
- `src/error.rs` - Unified error type with tests
- `src/lib.rs` - Export new types

### Lines of Code
- Production code: ~300 lines
- Test code: ~400 lines
- **Test-to-code ratio: 1.3:1** 🎯

## Testability Improvements

| Before | After |
|--------|-------|
| 0 tests | 70+ tests |
| No test infrastructure | In-memory DB + fixtures |
| Manual testing only | Automated test suite |
| Risky refactoring | Safe refactoring with regression tests |
| No examples | Tests serve as documentation |

## What's Next?

See the main todo list for the full DDD-to-Rust migration plan. The foundations are now in place to safely refactor the rest of the codebase.

Key goals for the next phase:
- Remove Handler pattern → Module functions
- Remove Arc/Mutex → Direct connection passing
- Remove DTOs → Builder pattern
- Add iterators → Streaming results
- Create Library struct → Unified entry point

---

**Status**: ✅ Phase 1 Complete - Ready for next phase of refactoring
