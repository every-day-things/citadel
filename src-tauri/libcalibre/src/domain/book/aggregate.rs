use crate::domain::author::entity::Author;
use crate::domain::book::entity::Book;
use crate::domain::file::entity::File;

#[derive(Debug)]
pub struct BookWithAuthorsAndFiles {
  pub book: Book,
  pub authors: Vec<Author>,
  pub files: Vec<File>
}

impl BookWithAuthorsAndFiles {
  pub fn new(book: Book, authors: Vec<Author>, files: Vec<File>) -> Self {
    Self { book, authors, files }
  }
}