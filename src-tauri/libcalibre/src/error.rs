use std::fmt;

use crate::types::{AuthorId, BookId};

#[derive(Debug, thiserror::Error)]
pub enum CalibreError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Book with given ID was not found.
    #[error("Book not found: {0}")]
    BookNotFound(BookId),

    /// Author with given ID was not found.
    #[error("Author not found: {0}")]
    AuthorNotFound(AuthorId),

    /// Book file with given ID was not found.
    #[error("Book file not found")]
    BookFileNotFound,

    /// Book file with given ID was not found.
    #[error("Book file not found")]
    BookCoverNotFound,

    #[error("Author cannot be deleted; they have associated books")]
    AuthorHasAssociatedBooks(Vec<BookId>),

    #[error("Library not initialized")]
    LibraryNotInitialized,

    #[error("Not implemented")]
    NotImplemented,

    /// Error indicating that a banned function was called, or a legal function
    /// was called with illegal parameters.
    ///
    /// Functions or function parameter values may be banned for security,
    /// stability, performance, or other reasons. Any time a ban error is
    /// returned, a reason is provideed.
    #[error("Banned function invocation")]
    BannedFunctionInvocation(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl CalibreError {
    /// Helper to create a database error from any error type
    pub fn database<E: fmt::Display>(error: E) -> Self {
        CalibreError::Database(error.to_string())
    }

    /// Helper to create an unknown error from any error type
    pub fn unknown<E: fmt::Display>(error: E) -> Self {
        CalibreError::Unknown(error.to_string())
    }
}

// Allow converting from Box<dyn std::error::Error> for gradual migration
impl From<Box<dyn std::error::Error>> for CalibreError {
    fn from(error: Box<dyn std::error::Error>) -> Self {
        CalibreError::Unknown(error.to_string())
    }
}
