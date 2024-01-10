use crate::domain::book_file::entity::{BookFile, NewBookFile, UpdateBookFile};

pub trait Repository {
    /// Create a new file entry
    fn create(&mut self, book: &NewBookFile) -> Result<BookFile, ()>;
    /// Find one file by ID.
    fn find_by_id(&mut self, id: i32) -> Result<BookFile, ()>;
    // List all files for a book
    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<BookFile>, ()>;
    /// Update a file entry
    fn update(&mut self, id: i32, book: &UpdateBookFile) -> Result<BookFile, ()>;
}
