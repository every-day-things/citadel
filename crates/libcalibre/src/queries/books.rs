//! Book queries
//!
//! Provides functions to interact with `books` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use diesel::prelude::*;
use diesel::sql_types::{Integer, Text};
use diesel::{sql_query, QueryDsl, QueryableByName, RunQueryDsl, SqliteConnection};

use crate::types::AuthorId;
use crate::{types::BookId, CalibreError};
use crate::{BookRow, NewBook, UpdateBookData};

// =============================================================================
// Core queries
// =============================================================================

pub(crate) fn get(
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Option<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    books
        .filter(id.eq(book_id.as_i32()))
        .select(BookRow::as_select())
        .first(conn)
        .optional()
        .map_err(CalibreError::from)
}

pub(crate) fn all(conn: &mut SqliteConnection) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    books
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn get_by_ids(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    let raw_ids: Vec<i32> = book_ids.iter().map(BookId::as_i32).collect();

    books
        .filter(id.eq_any(raw_ids))
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn search(
    conn: &mut SqliteConnection,
    query: &str,
) -> Result<Vec<BookId>, CalibreError> {
    #[derive(QueryableByName)]
    struct MatchedBook {
        #[diesel(sql_type = Integer)]
        id: i32,
    }

    let escaped = query
        .replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_");
    let pattern = format!("%{escaped}%");

    let matches: Vec<MatchedBook> = sql_query(
        "SELECT DISTINCT books.id FROM books \
         LEFT JOIN books_authors_link ON books_authors_link.book = books.id \
         LEFT JOIN authors ON authors.id = books_authors_link.author \
         LEFT JOIN books_series_link ON books_series_link.book = books.id \
         LEFT JOIN series ON series.id = books_series_link.series \
         WHERE books.title LIKE ? ESCAPE '\\' \
            OR authors.name LIKE ? ESCAPE '\\' \
            OR series.name LIKE ? ESCAPE '\\'",
    )
    .bind::<Text, _>(&pattern)
    .bind::<Text, _>(&pattern)
    .bind::<Text, _>(&pattern)
    .load(conn)
    .map_err(CalibreError::from)?;

    Ok(matches.into_iter().map(|m| BookId(m.id)).collect())
}

pub(crate) fn create(conn: &mut SqliteConnection, book: NewBook) -> Result<BookRow, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::insert_into(books)
        .values(book)
        .returning(BookRow::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn update(
    conn: &mut SqliteConnection,
    book_id: BookId,
    update: UpdateBookData,
) -> Result<usize, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::update(books.filter(id.eq(book_id.as_i32())))
        .set(update)
        .execute(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn delete(conn: &mut SqliteConnection, book_id: BookId) -> Result<bool, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::delete(books.filter(id.eq(book_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)
        .map(|affected_rows| affected_rows > 0)
}

// =============================================================================
// Relationships
// =============================================================================

pub(crate) fn find_authors(
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Vec<AuthorId>, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    let author_ids: Vec<AuthorId> = books_authors_link
        .filter(book.eq(book_id.as_i32()))
        .select(author)
        .load(conn)
        .map(|ids: Vec<i32>| ids.into_iter().map(AuthorId).collect())
        .map_err(CalibreError::from)?;

    Ok(author_ids)
}

pub(crate) fn find_by_author(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<Vec<BookId>, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    books_authors_link
        .filter(author.eq(author_id.as_i32()))
        .select(book)
        .load(conn)
        .map(|ids: Vec<i32>| ids.into_iter().map(BookId).collect())
        .map_err(CalibreError::from)
}
