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

    #[error("Database integrity error: {0}")]
    DatabaseIntegrity(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Book with given ID was not found.
    #[error("Book not found: {0}")]
    BookNotFound(BookId),

    /// Author with given ID was not found.
    #[error("Author not found: {0}")]
    AuthorNotFound(AuthorId),

    /// Book file with given ID and format was not found.
    #[error("Book file not found for book {0} with format {1}")]
    BookFileNotFound(BookId, String),

    /// Cover image for a book was not found.
    #[error("Book file not found")]
    BookCoverNotFound,

    #[error("Author cannot be deleted; they have associated books")]
    AuthorHasAssociatedBooks(Vec<BookId>),

    /// Identifier with given ID was not found.
    #[error("identifier not found: {0}")]
    IdentifierNotFound(IdentifierId),

    #[error("Library not initialized")]
    LibraryNotInitialized,

    #[error("Not implemented")]
    NotImplemented,

    #[error("Filesystem error: {0}")]
    FileSystem(String),

    /// Error indicating that a banned function was called, or a legal function
    /// was called with illegal parameters.
    ///
    /// Functions or function parameter values may be banned for security,
    /// stability, performance, or other reasons. Any time a ban error is
    /// returned, a reason is provided.
    #[error("Banned function invocation")]
    BannedFunctionInvocation(String),

    /// Failed to parse ID from string.
    #[error("failed to parse id: {0}")]
    ParseId(#[from] ParseIntError),

    /// Cover extraction failed.
    #[error("failed to extract cover from file: {0}")]
    CoverExtraction(String),

    #[error("Unknown error: {0}")]
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
#[allow(deprecated)]
pub type CalibreError = Error;

// Allow converting from Box<dyn std::error::Error> for gradual migration
impl From<Box<dyn std::error::Error>> for Error {
    fn from(error: Box<dyn std::error::Error>) -> Self {
        Error::Unknown(error.to_string())
    }
}
