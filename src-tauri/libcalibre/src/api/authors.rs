use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;
use diesel::SelectableHelper;

use crate::domain::author::entity::NewAuthor;
use crate::domain::author::entity::UpdateAuthorData;
use crate::Author;

pub struct AuthorsHandler {
    client: Arc<Mutex<SqliteConnection>>,
}

impl AuthorsHandler {
    pub(crate) fn new(client: Arc<Mutex<SqliteConnection>>) -> Self {
        Self { client }
    }

    pub fn list(&self) -> Result<Vec<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .select(Author::as_select())
            .load::<Author>(&mut *connection)
            .or(Err(()))
    }

    pub fn create(&mut self, new_author: &NewAuthor) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::insert_into(authors)
            .values(new_author)
            .returning(Author::as_returning())
            .get_result::<Author>(&mut *connection)
            .map_err(|_| ())
    }

    pub fn find_by_id(&mut self, search_id: i32) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .filter(id.eq(search_id))
            .select(Author::as_select())
            .get_result::<Author>(&mut *connection)
            .optional()
            .map_err(|_| ())
    }

    pub fn find_by_name(&mut self, search_name: &str) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .filter(name.eq(search_name))
            .select(Author::as_select())
            .get_result::<Author>(&mut *connection)
            .optional()
            .map_err(|_| ())
    }

    pub fn update(
        &mut self,
        author_id: i32,
        author: &crate::domain::author::entity::UpdateAuthorData,
    ) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::update(authors)
            .filter(id.eq(author_id))
            .set(author)
            .returning(Author::as_returning())
            .get_result(&mut *connection)
            .or(Err(()))
    }

    pub fn name_author_dir(&mut self, author: &Author) -> String {
        author.name.clone()
    }
}
