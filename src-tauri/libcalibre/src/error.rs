use std::fmt;

#[derive(Debug, thiserror::Error)]
pub enum CalibreError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Book not found")]
    BookNotFound(i32),

    #[error("Author not found")]
    AuthorNotFound(i32),

    #[error("Library not initialized")]
    LibraryNotInitialized,

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
