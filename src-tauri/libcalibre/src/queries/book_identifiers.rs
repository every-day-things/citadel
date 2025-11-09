//! Book identifiers queries
//!
//! Provides functions to interact with `identifiers` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use std::collections::HashMap;

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::models::Identifier;
use crate::{types::BookId, CalibreError};

pub(crate) fn get(
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Vec<Identifier>, CalibreError> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .filter(book.eq(book_id.as_i32()))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn get_many(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<HashMap<BookId, Vec<Identifier>>, CalibreError> {
    use crate::schema::identifiers::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let results: Vec<Identifier> = identifiers
        .filter(book.eq_any(ids))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(CalibreError::from)?;

    let mut mapped_results: HashMap<BookId, Vec<Identifier>> = HashMap::new();

    for result in results {
        let book_id = BookId::from(result.book);

        match mapped_results.get_mut(&book_id) {
            Some(id_list) => id_list.push(result),
            None => {
                mapped_results.insert(book_id, vec![result]);
            }
        }
    }

    Ok(mapped_results)
}

pub(crate) fn all(conn: &mut SqliteConnection) -> Result<Vec<Identifier>, CalibreError> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn update(
    conn: &mut SqliteConnection,
    book_id: BookId,
    identifier_type: String,
    value: String,
) -> Result<(), CalibreError> {
    use crate::schema::identifiers::dsl::*;

    diesel::update(
        identifiers
            .filter(book.eq(book_id.as_i32()))
            .filter(type_.eq(identifier_type)),
    )
    .set(val.eq(value))
    .execute(conn)
    .map(|_| ())
    .map_err(CalibreError::from)
}

pub(crate) fn create(
    conn: &mut SqliteConnection,
    book_id: BookId,
    identifier_type: String,
    value: String,
) -> Result<(), CalibreError> {
    use crate::schema::identifiers::dsl::*;

    diesel::insert_into(identifiers)
        .values((
            book.eq(book_id.as_i32()),
            type_.eq(identifier_type),
            val.eq(value),
        ))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

pub(crate) fn delete(
    conn: &mut SqliteConnection,
    book_id: BookId,
    identifier_type: String,
) -> Result<(), CalibreError> {
    use crate::schema::identifiers::dsl::*;

    diesel::delete(
        identifiers
            .filter(book.eq(book_id.as_i32()))
            .filter(type_.eq(identifier_type)),
    )
    .execute(conn)
    .map(|_| ())
    .map_err(CalibreError::from)
}

pub(crate) fn delete_all(conn: &mut SqliteConnection, book_id: BookId) -> Result<(), CalibreError> {
    use crate::schema::identifiers::dsl::*;

    diesel::delete(identifiers.filter(book.eq(book_id.as_i32())))
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
) -> Result<HashMap<BookId, Vec<Identifier>>, CalibreError> {
    use crate::schema::identifiers::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let idents = identifiers
        .filter(book.eq_any(ids))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(CalibreError::from);

    let mut grouped: HashMap<BookId, Vec<Identifier>> = HashMap::new();
    for ident in idents? {
        grouped
            .entry(BookId(ident.book))
            .or_insert_with(Vec::new)
            .push(ident)
    }

    Ok(grouped)
}
