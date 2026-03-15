//! Book description queries
//!
//! Provides functions to interact with `comments` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use std::collections::HashMap;

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::{types::BookId, CalibreError};

pub(crate) fn get(
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Option<String>, CalibreError> {
    use crate::schema::comments::dsl::*;

    comments
        .filter(book.eq(book_id.as_i32()))
        .select(text)
        .first(conn)
        .optional()
        .map_err(CalibreError::from)
}

pub(crate) fn update(
    conn: &mut SqliteConnection,
    book_id: BookId,
    description_text: String,
) -> Result<(), CalibreError> {
    use crate::schema::comments::dsl::*;

    diesel::update(comments.filter(book.eq(book_id.as_i32())))
        .set(text.eq(description_text))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

pub(crate) fn create(
    conn: &mut SqliteConnection,
    book_id: BookId,
    description_text: String,
) -> Result<(), CalibreError> {
    use crate::schema::comments::dsl::*;

    diesel::insert_into(comments)
        .values((book.eq(book_id.as_i32()), text.eq(description_text)))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

pub(crate) fn delete(conn: &mut SqliteConnection, book_id: BookId) -> Result<(), CalibreError> {
    use crate::schema::comments::dsl::*;

    diesel::delete(comments.filter(book.eq(book_id.as_i32())))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

// =============================================================================
// Relationships
// =============================================================================

pub(crate) fn find_many_by_book_ids(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<HashMap<BookId, String>, CalibreError> {
    use crate::schema::comments::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    comments
        .filter(book.eq_any(ids))
        .select((book, text))
        .load::<(i32, String)>(conn)
        .map(|results| {
            results
                .into_iter()
                .map(|(book_id, desc)| (BookId(book_id), desc))
                .collect()
        })
        .map_err(CalibreError::from)
}
