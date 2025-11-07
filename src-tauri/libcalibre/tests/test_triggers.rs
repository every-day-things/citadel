use diesel::prelude::*;
use diesel::sql_query;
use libcalibre::persistence::{establish_connection, register_triggers};
use tempfile::TempDir;

/// Helper to set up a test database with the Calibre schema
fn setup_test_db() -> (TempDir, String) {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("metadata.db");
    let db_path_str = db_path.to_str().unwrap().to_string();

    // Create a connection and initialize the database with the schema
    let mut conn = SqliteConnection::establish(&db_path_str).unwrap();

    // Create the minimal schema needed for testing
    sql_query(
        "CREATE TABLE books (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'Unknown',
            sort TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            pubdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            series_index REAL NOT NULL DEFAULT 1.0,
            author_sort TEXT,
            isbn TEXT DEFAULT '',
            lccn TEXT DEFAULT '',
            path TEXT NOT NULL DEFAULT '',
            flags INTEGER NOT NULL DEFAULT 1,
            uuid TEXT,
            has_cover BOOL DEFAULT 0,
            last_modified TIMESTAMP NOT NULL DEFAULT '2000-01-01 00:00:00+00:00'
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE authors (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            sort TEXT,
            link TEXT NOT NULL DEFAULT ''
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_authors_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            author INTEGER NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_publishers_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            publisher INTEGER NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_ratings_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            rating INTEGER NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_series_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            series INTEGER NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_tags_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            tag INTEGER NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_languages_link (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            lang_code INTEGER NOT NULL,
            item_order INTEGER NOT NULL DEFAULT 0
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE data (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            format TEXT NOT NULL,
            uncompressed_size INTEGER NOT NULL,
            name TEXT NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE comments (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            text TEXT NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE conversion_options (
            id INTEGER PRIMARY KEY,
            format TEXT NOT NULL,
            book INTEGER,
            data BLOB NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE books_plugin_data (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            name TEXT NOT NULL,
            val TEXT NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE identifiers (
            id INTEGER PRIMARY KEY,
            book INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'isbn',
            val TEXT NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    sql_query(
        "CREATE TABLE custom_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            label TEXT NOT NULL,
            name TEXT NOT NULL,
            datatype TEXT NOT NULL,
            mark_for_delete BOOL DEFAULT 0 NOT NULL,
            editable BOOL DEFAULT 1 NOT NULL,
            display TEXT DEFAULT '{}' NOT NULL,
            is_multiple BOOL DEFAULT 0 NOT NULL,
            normalized BOOL NOT NULL
        )"
    )
    .execute(&mut conn)
    .unwrap();

    (temp_dir, db_path_str)
}

#[test]
fn test_books_insert_trigger_generates_sort_and_uuid() {
    let (_temp_dir, db_path) = setup_test_db();
    let mut conn = establish_connection(&db_path).unwrap();

    // Insert a book with a title that should be sorted
    sql_query(
        "INSERT INTO books (title, path) VALUES ('The Great Gatsby', 'test/path')"
    )
    .execute(&mut conn)
    .unwrap();

    // Fetch the book to check if sort and uuid were generated
    #[derive(QueryableByName)]
    struct BookResult {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        sort: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        uuid: Option<String>,
    }

    let result: BookResult = sql_query("SELECT sort, uuid FROM books WHERE id = 1")
        .get_result(&mut conn)
        .unwrap();

    // Verify sort field was generated (moving "The" to the end)
    assert_eq!(result.sort, Some("Great Gatsby, The".to_string()));

    // Verify UUID was generated (should be a valid UUID format)
    assert!(result.uuid.is_some());
    let uuid = result.uuid.unwrap();
    assert_eq!(uuid.len(), 36); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    assert!(uuid.contains('-'));
}

#[test]
fn test_books_update_trigger_updates_sort() {
    let (_temp_dir, db_path) = setup_test_db();
    let mut conn = establish_connection(&db_path).unwrap();

    // Insert a book
    sql_query(
        "INSERT INTO books (title, path) VALUES ('Original Title', 'test/path')"
    )
    .execute(&mut conn)
    .unwrap();

    // Update the title
    sql_query(
        "UPDATE books SET title = 'The New Title' WHERE id = 1"
    )
    .execute(&mut conn)
    .unwrap();

    // Fetch the updated sort field
    #[derive(QueryableByName)]
    struct SortResult {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        sort: Option<String>,
    }

    let result: SortResult = sql_query("SELECT sort FROM books WHERE id = 1")
        .get_result(&mut conn)
        .unwrap();

    // Verify sort was updated (moving "The" to the end)
    assert_eq!(result.sort, Some("New Title, The".to_string()));
}

#[test]
fn test_books_delete_trigger_cascades() {
    let (_temp_dir, db_path) = setup_test_db();
    let mut conn = establish_connection(&db_path).unwrap();

    // Insert a book
    sql_query(
        "INSERT INTO books (title, path) VALUES ('Test Book', 'test/path')"
    )
    .execute(&mut conn)
    .unwrap();

    // Insert related records
    sql_query("INSERT INTO authors (id, name, link) VALUES (1, 'Test Author', '')")
        .execute(&mut conn)
        .unwrap();

    sql_query("INSERT INTO books_authors_link (book, author) VALUES (1, 1)")
        .execute(&mut conn)
        .unwrap();

    sql_query("INSERT INTO comments (book, text) VALUES (1, 'Test comment')")
        .execute(&mut conn)
        .unwrap();

    sql_query("INSERT INTO identifiers (book, type, val) VALUES (1, 'isbn', '1234567890')")
        .execute(&mut conn)
        .unwrap();

    sql_query("INSERT INTO data (book, format, uncompressed_size, name) VALUES (1, 'EPUB', 1024, 'test')")
        .execute(&mut conn)
        .unwrap();

    // Verify records exist
    #[derive(QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        count: i64,
    }

    let link_count: CountResult = sql_query("SELECT COUNT(*) as count FROM books_authors_link WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(link_count.count, 1);

    let comment_count: CountResult = sql_query("SELECT COUNT(*) as count FROM comments WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(comment_count.count, 1);

    // Delete the book
    sql_query("DELETE FROM books WHERE id = 1")
        .execute(&mut conn)
        .unwrap();

    // Verify all related records were deleted
    let link_count_after: CountResult = sql_query("SELECT COUNT(*) as count FROM books_authors_link WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(link_count_after.count, 0);

    let comment_count_after: CountResult = sql_query("SELECT COUNT(*) as count FROM comments WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(comment_count_after.count, 0);

    let identifier_count_after: CountResult = sql_query("SELECT COUNT(*) as count FROM identifiers WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(identifier_count_after.count, 0);

    let data_count_after: CountResult = sql_query("SELECT COUNT(*) as count FROM data WHERE book = 1")
        .get_result(&mut conn)
        .unwrap();
    assert_eq!(data_count_after.count, 0);
}

#[test]
fn test_register_triggers_is_idempotent() {
    let (_temp_dir, db_path) = setup_test_db();
    let mut conn = establish_connection(&db_path).unwrap();

    // Register triggers multiple times
    register_triggers(&mut conn).unwrap();
    register_triggers(&mut conn).unwrap();
    register_triggers(&mut conn).unwrap();

    // Insert a book to verify triggers still work
    sql_query(
        "INSERT INTO books (title, path) VALUES ('A Test Book', 'test/path')"
    )
    .execute(&mut conn)
    .unwrap();

    #[derive(QueryableByName)]
    struct BookResult {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        sort: Option<String>,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        uuid: Option<String>,
    }

    let result: BookResult = sql_query("SELECT sort, uuid FROM books WHERE id = 1")
        .get_result(&mut conn)
        .unwrap();

    // Verify triggers still work correctly
    assert_eq!(result.sort, Some("Test Book, A".to_string()));
    assert!(result.uuid.is_some());
}

#[test]
fn test_title_sort_with_various_articles() {
    let (_temp_dir, db_path) = setup_test_db();
    let mut conn = establish_connection(&db_path).unwrap();

    // Test with "The"
    sql_query("INSERT INTO books (title, path) VALUES ('The Matrix', 'path1')")
        .execute(&mut conn)
        .unwrap();

    // Test with "A"
    sql_query("INSERT INTO books (title, path) VALUES ('A Tale of Two Cities', 'path2')")
        .execute(&mut conn)
        .unwrap();

    // Test with "An"
    sql_query("INSERT INTO books (title, path) VALUES ('An American Tragedy', 'path3')")
        .execute(&mut conn)
        .unwrap();

    // Test without article
    sql_query("INSERT INTO books (title, path) VALUES ('Moby Dick', 'path4')")
        .execute(&mut conn)
        .unwrap();

    #[derive(QueryableByName)]
    struct BookResult {
        #[diesel(sql_type = diesel::sql_types::Integer)]
        id: i32,
        #[diesel(sql_type = diesel::sql_types::Text)]
        title: String,
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        sort: Option<String>,
    }

    let results: Vec<BookResult> = sql_query("SELECT id, title, sort FROM books ORDER BY id")
        .load(&mut conn)
        .unwrap();

    assert_eq!(results[0].sort, Some("Matrix, The".to_string()));
    assert_eq!(results[1].sort, Some("Tale of Two Cities, A".to_string()));
    assert_eq!(results[2].sort, Some("American Tragedy, An".to_string()));
    assert_eq!(results[3].sort, Some("Moby Dick".to_string()));
}
