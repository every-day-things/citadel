use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::domain::author::{
    entity::{Author, NewAuthor},
    repository::Repository,
};
use crate::persistence::establish_connection;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!("../../migrations");

pub struct AuthorRepository {
    pub connection: SqliteConnection,
}

impl AuthorRepository {
    pub fn new(connection_url: &str) -> Self {
        Self {
            connection: establish_connection(connection_url).unwrap(),
        }
    }

    /// Run all pending migrations.
    pub fn run_migrations(&mut self) {
        diesel::sql_query("PRAGMA foreign_keys = ON;")
            .execute(&mut self.connection)
            .unwrap();
        self.connection.run_pending_migrations(MIGRATIONS).unwrap();
    }
}

impl Repository for AuthorRepository {
    fn create(&mut self, new_author: &NewAuthor) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;

        let b = diesel::insert_into(authors)
            .values(new_author)
            .returning(Author::as_returning())
            .get_result(&mut self.connection)
            .expect("Could not create author");

        Ok(b)
    }

    fn find_by_id(&mut self, search_id: i32) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;

        let author = authors
            .filter(id.eq(search_id))
            .select(Author::as_select())
            .get_result::<Author>(&mut self.connection)
            .optional();

        match author {
            Ok(Some(b)) => Ok(b),
            Ok(None) => Err(()),
            Err(_) => Err(()),
        }
    }

    fn update(
        &mut self,
        author_id: i32,
        author: &crate::domain::author::entity::UpdateAuthorData,
    ) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;

        let updated = diesel::update(authors)
            .filter(id.eq(author_id))
            .set(author)
            .returning(Author::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()));

        updated
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
}
