//! Book files queries
//!
//! Provides functions to interact with `data` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use std::collections::HashMap;

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::entities::book_file::{NewBookFile, UpdateBookFile};
use crate::BookFile;
use crate::{
    types::{BookFileId, BookId},
    CalibreError,
};

pub(crate) fn get(
    conn: &mut SqliteConnection,
    file_id: BookFileId,
) -> Result<Option<BookFile>, CalibreError> {
    use crate::schema::data::dsl::*;

    data.filter(id.eq(file_id.as_i32()))
        .select(BookFile::as_returning())
        .get_result(conn)
        .optional()
        .map_err(CalibreError::from)
}

pub(crate) fn get_many(
    conn: &mut SqliteConnection,
    file_ids: Vec<BookFileId>,
) -> Result<Vec<BookFile>, CalibreError> {
    use crate::schema::data::dsl::*;

    let ids: Vec<i32> = file_ids.iter().map(|fid| fid.as_i32()).collect();

    data.filter(book.eq_any(ids))
        .select(BookFile::as_returning())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn all(conn: &mut SqliteConnection) -> Result<Vec<BookFile>, CalibreError> {
    use crate::schema::data::dsl::*;

    data.select(BookFile::as_returning())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn update(
    conn: &mut SqliteConnection,
    file_id: BookFileId,
    update: UpdateBookFile,
) -> Result<BookFile, CalibreError> {
    use crate::schema::data::dsl::*;

    diesel::update(data)
        .filter(id.eq(file_id.as_i32()))
        .set(update)
        .returning(BookFile::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn create(
    conn: &mut SqliteConnection,
    new_file: NewBookFile,
) -> Result<(), CalibreError> {
    use crate::schema::data::dsl::*;

    diesel::insert_into(data)
        .values(new_file)
        .returning(BookFile::as_returning())
        .get_result(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

pub(crate) fn delete(conn: &mut SqliteConnection, file_id: BookFileId) -> Result<(), CalibreError> {
    use crate::schema::data::dsl::*;

    diesel::delete(data.filter(id.eq(file_id.as_i32())))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

pub(crate) fn delete_all(conn: &mut SqliteConnection, book_id: BookId) -> Result<(), CalibreError> {
    use crate::schema::data::dsl::*;

    diesel::delete(data.filter(book.eq(book_id.as_i32())))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

// =============================================================================
// Relationships
// =============================================================================

pub(crate) fn find_by_book_id(
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Vec<BookFile>, CalibreError> {
    use crate::schema::data::dsl::*;

    data.filter(book.eq(book_id.as_i32()))
        .select(BookFile::as_returning())
        .load(conn)
        .map_err(CalibreError::from)
}

pub(crate) fn find_many_by_book_ids(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<HashMap<BookId, Vec<BookFile>>, CalibreError> {
    use crate::schema::data::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let files = data
        .filter(book.eq_any(ids))
        .select(BookFile::as_returning())
        .load(conn)
        .map_err(CalibreError::from);

    let mut grouped: HashMap<BookId, Vec<BookFile>> = HashMap::new();
    for file in files? {
        grouped
            .entry(BookId(file.book))
            .or_insert_with(Vec::new)
            .push(file);
    }

    Ok(grouped)
}

// =============================================================================
// Search
// =============================================================================

pub(crate) fn find_by_book_and_format(
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: String,
) -> Result<Option<BookFile>, CalibreError> {
    use crate::schema::data::dsl::*;
    let uppercased_format = file_format.to_uppercase();

    data.filter(book.eq(book_id.as_i32()))
        .filter(format.eq(uppercased_format))
        .select(BookFile::as_returning())
        .first(conn)
        .optional()
        .map_err(CalibreError::from)
}
