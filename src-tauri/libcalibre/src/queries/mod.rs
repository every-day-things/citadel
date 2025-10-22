//! Query modules for interacting with the Calibre database.
//!
//! This module provides idiomatic Rust APIs for database operations:
//! - Functions instead of handler structs
//! - Type-safe IDs (BookId, AuthorId, etc.)
//! - Proper error handling with Result<T, Error>
//! - Connection passed as `&mut SqliteConnection`
//!
//! # Example
//!
//! ```ignore
//! use libcalibre::queries::{books, authors};
//! use libcalibre::types::{BookId, AuthorId};
//!
//! let mut conn = establish_connection("path/to/metadata.db")?;
//!
//! // Find a book
//! let book = books::find(&mut conn, BookId(123))?;
//!
//! // List all authors
//! let all_authors = authors::list(&mut conn)?;
//!
//! // Create a book-author relationship
//! books::link_author(&mut conn, BookId(123), AuthorId(456))?;
//! ```

pub mod authors;
pub mod books;
pub mod identifiers;
