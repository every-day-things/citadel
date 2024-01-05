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

    fn find_by_id(&mut self, search_id: i32) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        let book = books
            .filter(id.eq(search_id))
            .select(Book::as_select())
            .get_result::<Book>(&mut self.connection)
            .optional();

        match book {
            Ok(Some(b)) => Ok(b),
            Ok(None) => Err(()),
            Err(_) => Err(()),
        }
    }

    fn update(
        &mut self,
        book_id: i32,
        book: &crate::domain::book::entity::UpdateBookData,
    ) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        let updated = diesel::update(books)
            .filter(id.eq(book_id))
            .set(book)
            .returning(Book::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()));

        updated
    }

    fn all(&mut self) -> Result<Vec<Book>, ()> {
        use crate::schema::books::dsl::*;

        let book_list = books
            .select(Book::as_select())
            .load::<Book>(&mut self.connection);

        match book_list {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }
}
