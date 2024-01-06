use crate::domain::book::entity::{Book, NewBook, UpdateBookData};

pub trait Repository {
    /// Return all books
    fn all(&mut self) -> Result<Vec<Book>, ()>;
    /// Create a new book
    fn create(&mut self, book: &NewBook) -> Result<Book, ()>;
    /// Find one book by ID.
    fn find_by_id(&mut self, id: i32) -> Result<Book, ()>;
    /// Update a book
    fn update(&mut self, id: i32, book: &UpdateBookData) -> Result<Book, ()>;
}
