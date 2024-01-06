use crate::domain::book::entity::{Book, NewBook, UpdateBookData};

pub trait Repository {
    /// Return all books
    fn all(&mut self) -> Result<Vec<Book>, ()>;
    /// Create a new book
    fn create(&mut self, book: &NewBook) -> Result<Book, ()>;
    /// Link this book to an author
    fn create_book_author_link(&mut self, book_id: i32, author_id: i32) -> Result<(), ()>;
    /// Find one book by ID.
    fn find_by_id(&mut self, id: i32) -> Result<Book, ()>;
    /// Find the IDs of all authors for a book
    fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()>;
    /// Update a book
    fn update(&mut self, id: i32, book: &UpdateBookData) -> Result<Book, ()>;
}
