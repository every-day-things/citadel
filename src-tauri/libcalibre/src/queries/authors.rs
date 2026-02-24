//! Author queries
//!
//! Provides functions to interact with `authors` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

use std::collections::HashMap;

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::entities::author::{NewAuthor, UpdateAuthorData};
use crate::sorting;
use crate::types::BookId;
use crate::{types::AuthorId, Author, CalibreError};

// =============================================================================
// Core queries
// =============================================================================

/// Find an author by ID. Returns `None` if not found.
pub fn find(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<Option<Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    authors
        .filter(id.eq(author_id.as_i32()))
        .select(Author::as_select())
        .first(conn)
        .optional()
        .map_err(CalibreError::from)
}

/// Fetch multiple authors by their IDs, returning a Vec preserving order.
pub(crate) fn get_many(
    conn: &mut SqliteConnection,
    author_ids: Vec<AuthorId>,
) -> Result<Vec<Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    let id_values: Vec<i32> = author_ids.iter().map(|aid| aid.as_i32()).collect();

    authors
        .filter(id.eq_any(id_values))
        .select(Author::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

/// Fetch multiple authors by their IDs, returning a HashMap keyed by AuthorId.
/// Authors that don't exist will not appear in the map.
pub fn batch_find(
    conn: &mut SqliteConnection,
    author_ids: &[AuthorId],
) -> Result<HashMap<AuthorId, Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    if author_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let id_values: Vec<i32> = author_ids.iter().map(|aid| aid.as_i32()).collect();

    let results: Vec<Author> = authors
        .filter(id.eq_any(id_values))
        .select(Author::as_select())
        .load(conn)
        .map_err(CalibreError::from)?;

    Ok(results
        .into_iter()
        .map(|author| (AuthorId(author.id), author))
        .collect())
}

pub fn find_by_name(
    conn: &mut SqliteConnection,
    author_name: &str,
) -> Result<Option<Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    authors
        .filter(name.eq(author_name))
        .select(Author::as_select())
        .first(conn)
        .optional()
        .map_err(CalibreError::from)
}

/// List all authors in the library.
pub fn list(conn: &mut SqliteConnection) -> Result<Vec<Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    authors
        .select(Author::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub fn create(
    conn: &mut SqliteConnection,
    new_author: NewAuthor,
) -> Result<Author, CalibreError> {
    use crate::schema::authors::dsl::*;

    diesel::insert_into(authors)
        .values(new_author)
        .returning(Author::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

/// Create an author if one with the given name doesn't already exist.
pub fn create_if_missing(
    conn: &mut SqliteConnection,
    new_author: NewAuthor,
) -> Result<Author, CalibreError> {
    match find_by_name(conn, &new_author.name)? {
        Some(existing) => Ok(existing),
        None => create(conn, new_author),
    }
}

/// Create an author by name if they don't already exist (generates sort name).
pub(crate) fn create_if_not_exists(
    conn: &mut SqliteConnection,
    author_name: &str,
) -> Result<Author, CalibreError> {
    match find_by_name(conn, author_name)? {
        Some(existing) => Ok(existing),
        None => {
            let new_author = NewAuthor {
                name: author_name.to_string(),
                sort: Some(sorting::sort_author_name_apa(author_name)),
                link: None,
            };
            create(conn, new_author)
        }
    }
}

pub fn update(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
    update: UpdateAuthorData,
) -> Result<Author, CalibreError> {
    use crate::schema::authors::dsl::*;

    diesel::update(authors.filter(id.eq(author_id.as_i32())))
        .set(&update)
        .returning(Author::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

/// Delete an author. Returns an error if the author has associated books.
pub fn delete(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<(), CalibreError> {
    let book_ids = find_books(conn, author_id)?;
    if !book_ids.is_empty() {
        return Err(CalibreError::AuthorHasAssociatedBooks(book_ids));
    }

    use crate::schema::authors::dsl::*;

    diesel::delete(authors.filter(id.eq(author_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)?;

    Ok(())
}

// =============================================================================
// Relationships
// =============================================================================

pub fn find_books(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<Vec<BookId>, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    let book_ids: Vec<BookId> = books_authors_link
        .filter(author.eq(author_id.as_i32()))
        .select(book)
        .load(conn)?
        .into_iter()
        .map(BookId)
        .collect();

    Ok(book_ids)
}

/// Count how many books an author has.
pub fn count_books(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<usize, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    let count: i64 = books_authors_link
        .filter(author.eq(author_id.as_i32()))
        .count()
        .get_result(conn)
        .map_err(CalibreError::from)?;

    Ok(count as usize)
}

pub(crate) fn link_book(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
    book_id: BookId,
) -> Result<(), CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::insert_into(books_authors_link)
        .values((author.eq(author_id.as_i32()), book.eq(book_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)?;

    Ok(())
}

pub(crate) fn unlink_book(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
    book_id: BookId,
) -> Result<(), CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::delete(
        books_authors_link
            .filter(author.eq(author_id.as_i32()))
            .filter(book.eq(book_id.as_i32())),
    )
    .execute(conn)
    .map_err(CalibreError::from)?;

    Ok(())
}

/// Batch fetch author IDs grouped by book ID.
pub(crate) fn find_author_ids_by_book_ids(
    conn: &mut SqliteConnection,
    book_ids: Vec<BookId>,
) -> Result<HashMap<BookId, Vec<AuthorId>>, CalibreError> {
    use crate::schema::books_authors_link::dsl::*;

    let ids: Vec<i32> = book_ids.iter().map(|bid| bid.as_i32()).collect();

    let links = books_authors_link
        .filter(book.eq_any(ids))
        .select((book, author))
        .load::<(i32, i32)>(conn)
        .map_err(CalibreError::from)?;

    let mut grouped: HashMap<BookId, Vec<AuthorId>> = HashMap::new();
    for (book_id_val, author_id_val) in links {
        grouped
            .entry(BookId(book_id_val))
            .or_insert_with(Vec::new)
            .push(AuthorId(author_id_val));
    }

    Ok(grouped)
}
