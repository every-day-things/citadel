//! Author query operations
//!
//! Provides functions to interact with `authors` in the Calibre database.
//! All functions use type-safe IDs and accept a mutable SQLite connection.

// =============================================================================
// Core operations
// =============================================================================

use diesel::prelude::*;
use diesel::{QueryDsl, RunQueryDsl, SqliteConnection};

use crate::entities::author::{NewAuthor, UpdateAuthorData};
use crate::sorting;
use crate::types::BookId;
use crate::{types::AuthorId, Author, CalibreError};

pub fn get(
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

pub fn get_many(
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

pub fn all(conn: &mut SqliteConnection) -> Result<Vec<Author>, CalibreError> {
    use crate::schema::authors::dsl::*;

    authors
        .select(Author::as_select())
        .load(conn)
        .map_err(CalibreError::from)
}

pub fn create(conn: &mut SqliteConnection, new_author: NewAuthor) -> Result<Author, CalibreError> {
    use crate::schema::authors::dsl::*;

    diesel::insert_into(authors)
        .values(new_author)
        .returning(Author::as_returning())
        .get_result(conn)
        .map_err(CalibreError::from)
}

pub fn create_if_not_exists(
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

pub fn delete(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<bool, CalibreError> {
    use crate::schema::authors::dsl::*;

    let affected_rows = diesel::delete(authors.filter(id.eq(author_id.as_i32())))
        .execute(conn)
        .map_err(CalibreError::from)?;

    Ok(affected_rows > 0)
}

pub fn bulk_get(
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

// =============================================================================
// Tests
// =============================================================================

// TODO
