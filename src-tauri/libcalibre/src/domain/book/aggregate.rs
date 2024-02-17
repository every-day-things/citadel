use crate::domain::author::entity::Author;
use crate::domain::book::entity::Book;
use crate::domain::book_file::entity::BookFile;

#[derive(Debug)]
pub struct BookWithAuthorsAndFiles {
    pub book: Book,
    pub authors: Vec<Author>,
    pub files: Vec<BookFile>,
}

impl BookWithAuthorsAndFiles {
    pub fn new(book: Book, authors: Vec<Author>, files: Vec<BookFile>) -> Self {
        Self {
            book,
            authors,
            files,
        }
    }
}
