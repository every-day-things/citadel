use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

use crate::domain::book::{
    entity::{Book, NewBook},
    repository::Repository,
};
use crate::persistence::establish_connection;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!("../../migrations");

pub struct BookRepository {
    pub connection: SqliteConnection,
}

impl BookRepository {
    pub fn new(connection_url: String) -> Self {
        Self {
            connection: establish_connection(connection_url.clone()).unwrap(),
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

fn uuid_for_book(conn: &mut SqliteConnection, book_id: i32) -> Option<String> {
    use crate::schema::books::dsl::*;

    let book_uuid = books
        .select(uuid)
        .filter(id.eq(book_id))
        .first::<Option<String>>(conn)
        .expect("Error getting book UUID");

    book_uuid
}

impl Repository for BookRepository {
    fn create(&mut self, book: &crate::domain::book::entity::NewBook) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        let new_book = NewBook {
            title: book.title.clone(),
            timestamp: book.timestamp,
            pubdate: book.pubdate,
            series_index: book.series_index,
            isbn: book.isbn.clone(),
            lccn: book.lccn.clone(),
            flags: book.flags,
            has_cover: book.has_cover,
        };

        let b = diesel::insert_into(books)
            .values(new_book)
            .returning(Book::as_returning())
            .get_result(&mut self.connection)
            .expect("Error saving new book");

        // SQLite doesn't add the UUID until after our `insert_into` call,
        // so we need to fetch it from the DB to provide it to the caller.
        let mut book_generated = b.clone();
        let book_uuid = uuid_for_book(&mut self.connection, b.id);
        book_generated.uuid = book_uuid;

        Ok(book_generated)
    }

    fn update(
        &self,
        id: i32,
        book: &crate::domain::book::entity::UpdateBookData,
    ) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        Err(())
    }
}
