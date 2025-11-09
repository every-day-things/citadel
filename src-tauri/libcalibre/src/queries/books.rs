//! Book queries
//!
//! Provides functions to interact with `books` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

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

pub(crate) fn get_many(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    books
        .filter(id.eq_any(ids))
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn all(conn: &mut SqliteConnection) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    books
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
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

pub(crate) fn bulk_get(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    books
        .filter(id.eq_any(ids))
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
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
