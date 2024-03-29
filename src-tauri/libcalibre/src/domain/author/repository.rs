use crate::domain::author::entity::{Author, NewAuthor, UpdateAuthorData};

pub trait Repository {
    fn all(&mut self) -> Result<Vec<Author>, ()>;
    fn create(&mut self, book: &NewAuthor) -> Result<Author, ()>;
    fn find_by_id(&mut self, id: i32) -> Result<Option<Author>, ()>;
    fn find_by_name(&mut self, name: &str) -> Result<Option<Author>, ()>;
    fn update(&mut self, id: i32, book: &UpdateAuthorData) -> Result<Author, ()>;
    fn name_author_dir(&mut self, author: &Author) -> String;
}
