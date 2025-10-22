use crate::types::{AuthorId, BookFileId, BookId, IdentifierId};
use std::fmt;
use std::num::ParseIntError;

/// Result type alias for libcalibre operations.
pub type Result<T> = std::result::Result<T, Error>;

/// Errors that can occur when working with a Calibre library.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Database operation failed.
    #[error("database error: {0}")]
    Database(#[from] diesel::result::Error),

    /// I/O operation failed.
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),

    /// Book with given ID was not found.
    #[error("book not found: {0}")]
    BookNotFound(BookId),

    /// Author with given ID was not found.
    #[error("author not found: {0}")]
    AuthorNotFound(AuthorId),

    /// Book file with given ID was not found.
    #[error("book file not found: {0}")]
    BookFileNotFound(BookFileId),

    /// Identifier with given ID was not found.
    #[error("identifier not found: {0}")]
    IdentifierNotFound(IdentifierId),

    /// Cannot delete author because they have books.
    #[error("cannot delete author {0} because they have {1} book(s)")]
    AuthorHasBooks(AuthorId, usize),

    /// Library path is invalid or not initialized.
    #[error("library not initialized at path: {0}")]
    LibraryNotInitialized(String),

    /// Failed to parse ID from string.
    #[error("failed to parse id: {0}")]
    ParseId(#[from] ParseIntError),

    /// Cover extraction failed.
    #[error("failed to extract cover from file: {0}")]
    CoverExtraction(String),

    /// Generic error for unknown cases.
    #[error("unknown error: {0}")]
    Unknown(String),
}

impl Error {
    /// Helper to create a database error from any error type.
    pub fn database<E: fmt::Display>(error: E) -> Self {
        Error::Unknown(format!("database error: {}", error))
    }

    /// Helper to create an unknown error from any error type.
    pub fn unknown<E: fmt::Display>(error: E) -> Self {
        Error::Unknown(error.to_string())
    }
}

// Maintain backwards compatibility with old CalibreError name
#[deprecated(since = "0.4.0", note = "use Error instead")]
pub type CalibreError = Error;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display_book_not_found() {
        let err = Error::BookNotFound(BookId(123));
        assert_eq!(err.to_string(), "book not found: book_123");
    }

    #[test]
    fn error_display_author_not_found() {
        let err = Error::AuthorNotFound(AuthorId(456));
        assert_eq!(err.to_string(), "author not found: author_456");
    }

    #[test]
    fn error_display_file_not_found() {
        let err = Error::BookFileNotFound(BookFileId(789));
        assert_eq!(err.to_string(), "book file not found: file_789");
    }

    #[test]
    fn error_display_author_has_books() {
        let err = Error::AuthorHasBooks(AuthorId(42), 5);
        assert_eq!(
            err.to_string(),
            "cannot delete author author_42 because they have 5 book(s)"
        );
    }

    #[test]
    fn error_from_io() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err = Error::from(io_err);
        assert!(matches!(err, Error::Io(_)));
        assert!(err.to_string().contains("file not found"));
    }

    #[test]
    fn error_from_parse_int() {
        let parse_err = "abc".parse::<i32>().unwrap_err();
        let err = Error::from(parse_err);
        assert!(matches!(err, Error::ParseId(_)));
    }

    #[test]
    fn error_helper_database() {
        let err = Error::database("connection failed");
        assert!(err.to_string().contains("database error"));
        assert!(err.to_string().contains("connection failed"));
    }

    #[test]
    fn error_helper_unknown() {
        let err = Error::unknown("something went wrong");
        assert_eq!(err.to_string(), "unknown error: something went wrong");
    }

    #[test]
    fn error_is_send_sync() {
        fn assert_send_sync<T: Send + Sync>() {}
        assert_send_sync::<Error>();
    }

    #[test]
    fn result_type_alias_works() {
        fn example() -> Result<i32> {
            Ok(42)
        }
        assert_eq!(example().unwrap(), 42);
    }
}
