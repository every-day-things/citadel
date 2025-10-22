//! Book queries
//!
//! Provides functions to interact with `books` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use std::collections::HashMap;

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::models::Identifier;
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

// =============================================================================
// Batch Operations (for performance)
// =============================================================================

/// Batch fetch descriptions for multiple books.
///
/// Returns a HashMap mapping BookId to description text.
/// More efficient than calling get_description for each book individually.
pub(crate) fn batch_get_descriptions(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, String>, CalibreError> {
    use crate::schema::comments::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let results: Vec<(i32, String)> = comments
        .filter(book.eq_any(&i32_ids))
        .select((book, text))
        .load(conn)
        .map_err(CalibreError::from)?;

    Ok(results
        .into_iter()
        .map(|(bid, txt)| (BookId(bid), txt))
        .collect())
}

/// Batch fetch author links for multiple books.
///
/// Returns a HashMap mapping BookId to a Vec of AuthorIds.
/// More efficient than calling find_authors for each book individually.
pub(crate) fn batch_get_author_links(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, Vec<AuthorId>>, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let results: Vec<(i32, i32)> = books_authors_link
        .filter(book.eq_any(&i32_ids))
        .select((book, author))
        .load(conn)
        .map_err(CalibreError::from)?;

    let mut map: HashMap<BookId, Vec<AuthorId>> = HashMap::new();
    for (book_id, author_id) in results {
        map.entry(BookId(book_id))
            .or_insert_with(Vec::new)
            .push(AuthorId(author_id));
    }

    Ok(map)
}

/// Batch fetch identifiers for multiple books.
///
/// Returns a HashMap mapping BookId to a Vec of Identifiers.
/// More efficient than fetching per-book individually.
pub(crate) fn batch_get_identifiers(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, Vec<Identifier>>, CalibreError> {
    use crate::schema::identifiers::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let results: Vec<Identifier> = identifiers
        .filter(book.eq_any(&i32_ids))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(CalibreError::from)?;

    let mut map: HashMap<BookId, Vec<Identifier>> = HashMap::new();
    for identifier in results {
        map.entry(BookId(identifier.book))
            .or_insert_with(Vec::new)
            .push(identifier);
    }

    Ok(map)
}
