use crate::entities::{author::Author, book::Book, book_file::BookFile};

#[derive(Debug)]
pub struct BookWithAuthorsAndFiles {
    pub book: Book,
    pub authors: Vec<Author>,
    pub files: Vec<BookFile>,
    /// A partially HTML-formatted description of the book. User-editable.
    pub book_description_html: Option<String>,
    pub is_read: bool,
}

impl BookWithAuthorsAndFiles {
    pub fn new(
        book: Book,
        authors: Vec<Author>,
        files: Vec<BookFile>,
        description: Option<String>,
        is_read: bool,
    ) -> Self {
        Self {
            book,
            authors,
            files,
            book_description_html: description,
            is_read,
        }
    }
}
