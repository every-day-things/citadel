//! Query modules for interacting with the Calibre database.
//!
//! This module provides idiomatic Rust APIs for database operations:
//! - Functions instead of handler structs
//! - Type-safe IDs (BookId, AuthorId, etc.)
//! - Proper error handling with Result<T, Error>
//! - Connection passed as `&mut SqliteConnection`

pub mod authors;
pub mod book_descriptions;
pub mod book_files;
pub mod book_identifiers;
pub mod books;
pub mod identifiers;
