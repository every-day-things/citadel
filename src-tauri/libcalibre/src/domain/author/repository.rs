use crate::domain::author::entity::{NewAuthor, Author, UpdateAuthorData};

pub trait Repository {
  fn all(&mut self) -> Result<Vec<Author>, ()>;
  fn create(&mut self, book: &NewAuthor) -> Result<Author, ()>;
  fn find_by_id(&mut self, id: i32) -> Result<Author, ()>;
  fn update(&mut self, id: i32, book: &UpdateAuthorData) -> Result<Author, ()>;
}