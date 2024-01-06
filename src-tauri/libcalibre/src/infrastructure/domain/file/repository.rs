use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::domain::file::{
    entity::{File, NewFile, UpdateFile},
    repository::Repository,
};
use crate::persistence::establish_connection;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!("../../migrations");

pub struct FileRepository {
    pub connection: SqliteConnection,
}

impl FileRepository {
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

impl Repository for FileRepository {
    fn create(&mut self, new_file: &NewFile) -> Result<File, ()> {
        use crate::schema::data::dsl::*;

        let created = diesel::insert_into(data)
            .values(new_file)
            .returning(File::as_returning())
            .get_result(&mut self.connection);

        match created {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn find_by_id(&mut self, search_id: i32) -> Result<File, ()> {
        use crate::schema::data::dsl::*;

        let file = data
            .filter(id.eq(search_id))
            .select(File::as_select())
            .get_result::<File>(&mut self.connection)
            .optional();

        match file {
            Ok(Some(b)) => Ok(b),
            Ok(None) => Err(()),
            Err(_) => Err(()),
        }
    }

    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<File>, ()> {
        use crate::schema::data::dsl::*;

        let files = data
            .filter(book.eq(book_id))
            .select(File::as_select())
            .get_results::<File>(&mut self.connection);

        match files {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn update(
        &mut self,
        file_id: i32,
        file: &UpdateFile
    ) -> Result<File, ()> {
        use crate::schema::data::dsl::*;

        let updated = diesel::update(data)
            .filter(id.eq(file_id))
            .set(file)
            .returning(File::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()));

        updated
    }
}
