pub mod helpers;
pub mod snapshot;

pub use helpers::*;
pub use snapshot::DatabaseSnapshot;

// Re-export in-memory test helpers for new query module tests
pub use in_memory::*;

/// In-memory test utilities for lightweight query module testing.
mod in_memory {
    use diesel::prelude::*;
    use diesel::sqlite::SqliteConnection;
    use libcalibre::types::{AuthorId, BookId};

    /// Creates an in-memory SQLite database with minimal Calibre schema.
    pub fn setup_test_db() -> SqliteConnection {
        let mut conn = SqliteConnection::establish(":memory:")
            .expect("Failed to create in-memory database");

        // Create minimal schema matching Calibre structure
        diesel::sql_query(
            r#"
            CREATE TABLE books (
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

            CREATE TABLE authors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL COLLATE NOCASE,
                sort TEXT COLLATE NOCASE,
                link TEXT NOT NULL DEFAULT ""
            );

            CREATE TABLE books_authors_link (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book INTEGER NOT NULL,
                author INTEGER NOT NULL,
                UNIQUE(book, author)
            );

            CREATE TABLE data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book INTEGER NOT NULL,
                format TEXT NOT NULL COLLATE NOCASE,
                uncompressed_size INTEGER NOT NULL,
                name TEXT NOT NULL,
                UNIQUE(book, format)
            );

            CREATE TABLE comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book INTEGER NOT NULL,
                text TEXT NOT NULL COLLATE NOCASE,
                UNIQUE(book)
            );

            CREATE TABLE identifiers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book INTEGER NOT NULL,
                type TEXT NOT NULL DEFAULT "isbn" COLLATE NOCASE,
                val TEXT NOT NULL COLLATE NOCASE,
                UNIQUE(book, type)
            );
            "#,
        )
        .execute(&mut conn)
        .expect("Failed to create test schema");

        conn
    }

    /// Helper to create a test author.
    pub fn create_test_author(conn: &mut SqliteConnection, name: &str) -> AuthorId {
        use libcalibre::schema::authors::dsl::*;

        let result = diesel::insert_into(authors)
            .values((name.eq(name), sort.eq(name), link.eq("")))
            .returning(id)
            .get_result::<i32>(conn)
            .expect("Failed to create test author");

        AuthorId(result)
    }

    /// Helper to create a test book.
    pub fn create_test_book(conn: &mut SqliteConnection, title_text: &str) -> BookId {
        use libcalibre::schema::books::dsl::*;

        let result = diesel::insert_into(books)
            .values((title.eq(title_text), sort.eq(title_text), flags.eq(1)))
            .returning(id)
            .get_result::<i32>(conn)
            .expect("Failed to create test book");

        BookId(result)
    }

    /// Helper to link an author to a book.
    pub fn link_author_to_book(
        conn: &mut SqliteConnection,
        book_id: BookId,
        author_id: AuthorId,
    ) {
        use libcalibre::schema::books_authors_link::dsl::*;

        diesel::insert_into(books_authors_link)
            .values((book.eq(book_id.as_i32()), author.eq(author_id.as_i32())))
            .execute(conn)
            .expect("Failed to link author to book");
    }
}
