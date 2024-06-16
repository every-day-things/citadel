use crate::{domain::book::entity::{Book, NewBook, UpdateBookData}, models::Identifier};

use super::entity::UpsertBookIdentifier;

pub trait Repository {
    /// Return all books
    fn all(&mut self) -> Result<Vec<Book>, ()>;
    /// Create a new book
    fn create(&mut self, book: &NewBook) -> Result<Book, ()>;
    /// Link this book to an author
    fn create_book_author_link(&mut self, book_id: i32, author_id: i32) -> Result<(), ()>;
    /// Unlink this book from an author
    fn remove_book_author_link(&mut self, book_id: i32, author_id: i32) -> Result<(), ()>;
    /// Find one book by ID.
    fn find_by_id(&mut self, id: i32) -> Result<Book, ()>;
    /// Find the IDs of all authors for a book
    fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()>;
    /// Update a book
    fn update(&mut self, id: i32, book: &UpdateBookData) -> Result<Book, ()>;
    /// List all associated identifiers for a book.
    fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()>;
    /// Add new identifier (no id) or update existing identifier (with ID).
    fn upsert_book_identifier(&mut self, update: UpsertBookIdentifier) -> Result<i32, ()>;
}
