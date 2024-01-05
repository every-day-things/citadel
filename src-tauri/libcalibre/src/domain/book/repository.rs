use crate::domain::book::entity::{NewBook, Book, UpdateBookData};

pub trait Repository {
  fn create(&mut self, book: &NewBook) -> Result<Book, ()>;
  fn update(&self, id: i32, book: &UpdateBookData) -> Result<Book, ()>;
}