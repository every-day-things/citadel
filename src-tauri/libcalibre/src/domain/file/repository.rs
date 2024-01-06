use crate::domain::file::entity::{File, NewFile, UpdateFile};

pub trait Repository {
    /// Create a new file entry
    fn create(&mut self, book: &NewFile) -> Result<File, ()>;
    /// Find one file by ID.
    fn find_by_id(&mut self, id: i32) -> Result<File, ()>;
    // List all files for a book
    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<File>, ()>;
    /// Update a file entry
    fn update(&mut self, id: i32, book: &UpdateFile) -> Result<File, ()>;
}
