use crate::entities::{author::Author, book::Book, book_file::BookFile};

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
