use crate::entities::{author::Author, book::Book, book_file::BookFile};

#[derive(Debug)]
pub struct BookWithAuthorsAndFiles {
    pub book: Book,
    pub authors: Vec<Author>,
    pub files: Vec<BookFile>,
    /// An partially HTML-formatted description of the book. User-editable.
    pub book_description_html: Option<String>,
}

impl BookWithAuthorsAndFiles {
    pub fn new(
        book: Book,
        authors: Vec<Author>,
        files: Vec<BookFile>,
        description: Option<String>,
    ) -> Self {
        Self {
            book,
            authors,
            files,
            book_description_html: description,
        }
    }
}
