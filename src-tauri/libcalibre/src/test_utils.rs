//! Test utilities for libcalibre.
//!
//! This module provides helpers for setting up in-memory test databases
//! and creating fixture data for tests.

#![cfg(test)]

use crate::types::{AuthorId, BookId};
use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;

/// Creates an in-memory SQLite database with minimal schema for testing.
pub fn setup_test_db() -> SqliteConnection {
    let mut conn = SqliteConnection::establish(":memory:")
        .expect("Failed to create in-memory database");

    // Create minimal schema for testing
    diesel::sql_query(
        r#"
        CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            sort TEXT,
            timestamp TEXT,
            pubdate TEXT,
            series_index REAL NOT NULL DEFAULT 1.0,
            author_sort TEXT,
            isbn TEXT,
            lccn TEXT,
            path TEXT,
            flags INTEGER NOT NULL DEFAULT 1,
            uuid TEXT,
            has_cover INTEGER DEFAULT 0,
            last_modified TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS authors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL COLLATE NOCASE,
            sort TEXT COLLATE NOCASE,
            link TEXT NOT NULL DEFAULT ""
        );

        CREATE TABLE IF NOT EXISTS books_authors_link (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book INTEGER NOT NULL,
            author INTEGER NOT NULL,
            UNIQUE(book, author)
        );

        CREATE TABLE IF NOT EXISTS data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book INTEGER NOT NULL,
            format TEXT NOT NULL COLLATE NOCASE,
            uncompressed_size INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE(book, format)
        );

        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book INTEGER NOT NULL,
            text TEXT NOT NULL COLLATE NOCASE,
            UNIQUE(book)
        );

        CREATE TABLE IF NOT EXISTS identifiers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT "isbn" COLLATE NOCASE,
            val TEXT NOT NULL COLLATE NOCASE,
            UNIQUE(book, type)
        );

        CREATE TABLE IF NOT EXISTS custom_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            name TEXT NOT NULL,
            datatype TEXT NOT NULL,
            mark_for_delete INTEGER DEFAULT 0 NOT NULL,
            editable INTEGER DEFAULT 1 NOT NULL,
            display TEXT DEFAULT '{}',
            is_multiple INTEGER DEFAULT 0 NOT NULL,
            normalized INTEGER NOT NULL
        );

        -- Register custom SQL functions for Calibre compatibility
        "#,
    )
    .execute(&mut conn)
    .expect("Failed to create schema");

    conn
}

/// Test fixture builder for creating test data.
pub struct TestFixtures {
    conn: SqliteConnection,
}

impl TestFixtures {
    /// Create a new test fixtures instance with a fresh in-memory database.
    pub fn new() -> Self {
        Self {
            conn: setup_test_db(),
        }
    }

    /// Get a mutable reference to the underlying connection.
    pub fn conn(&mut self) -> &mut SqliteConnection {
        &mut self.conn
    }

    /// Create a test author with the given name.
    pub fn create_author(&mut self, name: &str) -> AuthorId {
        use crate::schema::authors::dsl::*;

        let result = diesel::insert_into(authors)
            .values((
                name.eq(name),
                sort.eq(name),
                link.eq(""),
            ))
            .returning(id)
            .get_result::<i32>(&mut self.conn)
            .expect("Failed to create test author");

        AuthorId(result)
    }

    /// Create a test book with the given title.
    pub fn create_book(&mut self, title: &str) -> BookId {
        use crate::schema::books::dsl::*;

        let result = diesel::insert_into(books)
            .values((
                title.eq(title),
                sort.eq(title),
                flags.eq(1),
                series_index.eq(1.0),
            ))
            .returning(id)
            .get_result::<i32>(&mut self.conn)
            .expect("Failed to create test book");

        BookId(result)
    }

    /// Create a test book with an author.
    pub fn create_book_with_author(&mut self, book_title: &str, author_name: &str) -> (BookId, AuthorId) {
        let author_id = self.create_author(author_name);
        let book_id = self.create_book(book_title);
        self.link_author_to_book(book_id, author_id);
        (book_id, author_id)
    }

    /// Link an author to a book.
    pub fn link_author_to_book(&mut self, book_id: BookId, author_id: AuthorId) {
        use crate::schema::books_authors_link::dsl::*;

        diesel::insert_into(books_authors_link)
            .values((
                book.eq(book_id.as_i32()),
                author.eq(author_id.as_i32()),
            ))
            .execute(&mut self.conn)
            .expect("Failed to link author to book");
    }

    /// Set a book's description.
    pub fn set_description(&mut self, book_id: BookId, description: &str) {
        use crate::schema::comments::dsl::*;

        diesel::insert_into(comments)
            .values((
                book.eq(book_id.as_i32()),
                text.eq(description),
            ))
            .execute(&mut self.conn)
            .expect("Failed to set description");
    }

    /// Add an identifier to a book.
    pub fn add_identifier(&mut self, book_id: BookId, id_type: &str, value: &str) {
        use crate::schema::identifiers::dsl::*;

        diesel::insert_into(identifiers)
            .values((
                book.eq(book_id.as_i32()),
                type_.eq(id_type),
                val.eq(value),
            ))
            .execute(&mut self.conn)
            .expect("Failed to add identifier");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_setup_creates_database() {
        let _conn = setup_test_db();
        // If we got here, setup succeeded
    }

    #[test]
    fn test_fixtures_create_author() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Test Author");
        assert_eq!(author_id.as_i32(), 1); // First ID
    }

    #[test]
    fn test_fixtures_create_book() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        assert_eq!(book_id.as_i32(), 1); // First ID
    }

    #[test]
    fn test_fixtures_create_book_with_author() {
        let mut fixtures = TestFixtures::new();
        let (book_id, author_id) = fixtures.create_book_with_author("Test Book", "Test Author");

        // Verify they were created
        assert_eq!(book_id.as_i32(), 1);
        assert_eq!(author_id.as_i32(), 1);

        // Verify link exists
        use crate::schema::books_authors_link::dsl::*;
        let count: i64 = books_authors_link
            .filter(book.eq(book_id.as_i32()))
            .filter(author.eq(author_id.as_i32()))
            .count()
            .get_result(fixtures.conn())
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_fixtures_set_description() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        fixtures.set_description(book_id, "This is a test description");

        // Verify description was set
        use crate::schema::comments::dsl::*;
        let desc: String = comments
            .filter(book.eq(book_id.as_i32()))
            .select(text)
            .first(fixtures.conn())
            .unwrap();
        assert_eq!(desc, "This is a test description");
    }

    #[test]
    fn test_fixtures_add_identifier() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");

        // Verify identifier was added
        use crate::schema::identifiers::dsl::*;
        let isbn: String = identifiers
            .filter(book.eq(book_id.as_i32()))
            .filter(type_.eq("isbn"))
            .select(val)
            .first(fixtures.conn())
            .unwrap();
        assert_eq!(isbn, "978-0-123456-78-9");
    }
}
