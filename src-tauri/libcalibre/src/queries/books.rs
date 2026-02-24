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

/// Find a book by ID. Returns `None` if not found.
pub fn find(
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

/// List all books in the library.
pub fn list(conn: &mut SqliteConnection) -> Result<Vec<BookRow>, CalibreError> {
    use crate::schema::books::dsl::*;

    books
        .select(BookRow::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub fn create(conn: &mut SqliteConnection, book: NewBook) -> Result<BookRow, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::insert_into(books)
        .values(book)
        .returning(BookRow::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

/// Update a book, returning the updated row.
pub fn update(
    conn: &mut SqliteConnection,
    book_id: BookId,
    update: UpdateBookData,
) -> Result<BookRow, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::update(books.filter(id.eq(book_id.as_i32())))
        .set(update)
        .returning(BookRow::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

/// Delete a book. Returns `true` if a row was deleted.
pub fn delete(conn: &mut SqliteConnection, book_id: BookId) -> Result<bool, CalibreError> {
    use crate::schema::books::dsl::*;

    diesel::delete(books.filter(id.eq(book_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)
        .map(|affected_rows| affected_rows > 0)
}

// =============================================================================
// Relationships
// =============================================================================

pub fn find_authors(
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

/// Link an author to a book.
pub fn link_author(
    conn: &mut SqliteConnection,
    book_id: BookId,
    author_id: AuthorId,
) -> Result<(), CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::insert_into(books_authors_link)
        .values((book.eq(book_id.as_i32()), author.eq(author_id.as_i32())))
        .execute(conn)
        .map(|_| ())
        .map_err(CalibreError::from)
}

/// Unlink an author from a book.
pub fn unlink_author(
    conn: &mut SqliteConnection,
    book_id: BookId,
    author_id: AuthorId,
) -> Result<(), CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::delete(
        books_authors_link
            .filter(book.eq(book_id.as_i32()))
            .filter(author.eq(author_id.as_i32())),
    )
    .execute(conn)
    .map(|_| ())
    .map_err(CalibreError::from)
}

/// Replace all authors for a book atomically.
pub fn replace_authors(
    conn: &mut SqliteConnection,
    book_id: BookId,
    new_author_ids: &[AuthorId],
) -> Result<(), CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::delete(books_authors_link.filter(book.eq(book_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)?;

    if !new_author_ids.is_empty() {
        let values: Vec<_> = new_author_ids
            .iter()
            .map(|aid| (book.eq(book_id.as_i32()), author.eq(aid.as_i32())))
            .collect();

        diesel::insert_into(books_authors_link)
            .values(&values)
            .execute(conn)
            .map_err(CalibreError::from)?;
    }

    Ok(())
}

// =============================================================================
// Descriptions
// =============================================================================

/// Get the description (HTML) for a book.
pub fn get_description(
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

/// Set or update the description for a book (upsert).
pub fn set_description(
    conn: &mut SqliteConnection,
    book_id: BookId,
    description: &str,
) -> Result<(), CalibreError> {
    use crate::schema::comments::dsl::*;

    let existing_id: Option<i32> = comments
        .filter(book.eq(book_id.as_i32()))
        .select(id)
        .first(conn)
        .optional()
        .map_err(CalibreError::from)?;

    match existing_id {
        Some(comment_id) => {
            diesel::update(comments.filter(id.eq(comment_id)))
                .set(text.eq(description))
                .execute(conn)
                .map(|_| ())
                .map_err(CalibreError::from)
        }
        None => {
            diesel::insert_into(comments)
                .values((book.eq(book_id.as_i32()), text.eq(description)))
                .execute(conn)
                .map(|_| ())
                .map_err(CalibreError::from)
        }
    }
}

// =============================================================================
// Batch Operations (for performance)
// =============================================================================

/// Batch fetch descriptions for multiple books in a single query.
pub fn batch_get_descriptions(
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

/// Batch fetch author links for multiple books in a single query.
pub fn batch_get_author_links(
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

/// Batch fetch identifiers for multiple books in a single query.
pub fn batch_get_identifiers(
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
