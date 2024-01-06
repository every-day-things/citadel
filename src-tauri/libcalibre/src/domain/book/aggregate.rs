use crate::domain::author::entity::Author;
use crate::domain::book::entity::Book;

#[derive(Debug)]
pub struct BookWithAuthorsAndFiles {
  pub book: Book,
  pub authors: Vec<Author>,
}

impl BookWithAuthorsAndFiles {
  pub fn new(book: Book, authors: Vec<Author>) -> Self {
    Self { book, authors }
  }
}