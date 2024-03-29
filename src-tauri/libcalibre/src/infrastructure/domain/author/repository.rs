use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;

use crate::domain::author::{
    entity::{Author, NewAuthor},
    repository::Repository,
};
use crate::persistence::establish_connection;

pub struct AuthorRepository {
    pub connection: SqliteConnection,
}

impl AuthorRepository {
    pub fn new(connection_url: &str) -> Self {
        Self {
            connection: establish_connection(connection_url).unwrap(),
        }
    }
}

impl Repository for AuthorRepository {
    fn create(&mut self, new_author: &NewAuthor) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;

        diesel::insert_into(authors)
            .values(new_author)
            .returning(Author::as_returning())
            .get_result::<Author>(&mut self.connection)
            .map_err(|_| ())
    }

    fn find_by_id(&mut self, search_id: i32) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;

        authors
            .filter(id.eq(search_id))
            .select(Author::as_select())
            .get_result::<Author>(&mut self.connection)
            .optional()
            .map_err(|_| ())
    }

    fn find_by_name(&mut self, search_name: &str) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;

        authors
            .filter(name.eq(search_name))
            .select(Author::as_select())
            .get_result::<Author>(&mut self.connection)
            .optional()
            .map_err(|_| ())
    }

    fn update(
        &mut self,
        author_id: i32,
        author: &crate::domain::author::entity::UpdateAuthorData,
    ) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;

        diesel::update(authors)
            .filter(id.eq(author_id))
            .set(author)
            .returning(Author::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()))
    }

    fn all(&mut self) -> Result<Vec<Author>, ()> {
        use crate::schema::authors::dsl::*;

        let author_list = authors
            .select(Author::as_select())
            .load::<Author>(&mut self.connection);

        match author_list {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn name_author_dir(&mut self, author: &Author) -> String {
        author.name.clone()
    }
}
