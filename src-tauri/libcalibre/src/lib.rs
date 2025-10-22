mod assets;
mod cover_image;
mod entities;
pub mod error;
pub mod library;
pub mod mime_type;
pub(crate) mod models;
mod operations;
pub mod persistence;
pub mod queries;
pub(crate) mod schema;
pub mod sorting;
#[cfg(test)]
mod test_utils;
pub mod types;
pub mod util;

// Re-export the main API types
pub use error::CalibreError;
pub use library::{
    Author as LibraryAuthor, AuthorAdd, AuthorUpdate, Book as LibraryBook, BookAdd, BookFileInfo,
    BookIdentifier, BookUpdate, Library,
};
pub use types::{AuthorId, BookFileId, BookId, IdentifierId};

// Keep entity exports that are needed internally (for operations/queries)
pub(crate) use entities::{
    author::Author, book_file::BookFile, book_row::BookRow, book_row::NewBook,
    book_row::UpdateBookData,
};
