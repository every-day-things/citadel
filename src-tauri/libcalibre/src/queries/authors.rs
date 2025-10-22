//! Author query operations using idiomatic Rust patterns.
//!
//! This module provides functions for interacting with authors in the Calibre database.
//! All functions accept a `&mut SqliteConnection` parameter and use type-safe IDs.

use crate::entities::author::{NewAuthor, UpdateAuthorData};
use crate::error::{Error, Result};
use crate::types::{AuthorId, BookId};
use crate::Author;
use diesel::prelude::*;
use std::collections::HashMap;

// ============================================================================
// Core CRUD Operations
// ============================================================================

/// Find an author by their ID.
///
/// Returns `Ok(Some(author))` if found, `Ok(None)` if not found.
pub fn find(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<Option<Author>> {
    use crate::schema::authors::dsl::*;

    authors
        .filter(id.eq(author_id.as_i32()))
        .select(Author::as_select())
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// Find an author by their name.
///
/// Performs an exact match on the author's name.
pub fn find_by_name(conn: &mut SqliteConnection, search_name: &str) -> Result<Option<Author>> {
    use crate::schema::authors::dsl::*;

    authors
        .filter(name.eq(search_name))
        .select(Author::as_select())
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// List all authors in the library.
pub fn list(conn: &mut SqliteConnection) -> Result<Vec<Author>> {
    use crate::schema::authors::dsl::*;

    authors
        .select(Author::as_select())
        .load(conn)
        .map_err(Error::from)
}

/// Create a new author.
///
/// Returns the created author with its assigned ID.
pub fn create(conn: &mut SqliteConnection, new_author: NewAuthor) -> Result<Author> {
    use crate::schema::authors::dsl::*;

    diesel::insert_into(authors)
        .values(new_author)
        .returning(Author::as_returning())
        .get_result(conn)
        .map_err(Error::from)
}

/// Create an author if they don't already exist (by name).
///
/// If an author with the given name exists, returns the existing author.
/// Otherwise, creates a new author.
pub fn create_if_missing(conn: &mut SqliteConnection, new_author: NewAuthor) -> Result<Author> {
    match find_by_name(conn, &new_author.name)? {
        Some(existing) => Ok(existing),
        None => create(conn, new_author),
    }
}

/// Update an existing author.
///
/// Returns the updated author, or an error if the author doesn't exist.
pub fn update(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
    update_data: UpdateAuthorData,
) -> Result<Author> {
    use crate::schema::authors::dsl::*;

    diesel::update(authors.filter(id.eq(author_id.as_i32())))
        .set(update_data)
        .returning(Author::as_returning())
        .get_result(conn)
        .map_err(Error::from)
}

/// Delete an author by their ID.
///
/// Returns an error if the author has books linked to them.
/// You must unlink all books before deleting an author.
pub fn delete(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<()> {
    use crate::schema::authors::dsl::*;
    use crate::schema::books_authors_link;

    // Check if the author has any linked books
    let book_count: i64 = books_authors_link::table
        .filter(books_authors_link::author.eq(author_id.as_i32()))
        .count()
        .get_result(conn)?;

    if book_count > 0 {
        return Err(Error::AuthorHasBooks(author_id, book_count as usize));
    }

    // Delete the author
    let rows_deleted = diesel::delete(authors.filter(id.eq(author_id.as_i32()))).execute(conn)?;

    if rows_deleted == 0 {
        Err(Error::AuthorNotFound(author_id))
    } else {
        Ok(())
    }
}

// ============================================================================
// Batch Operations
// ============================================================================

/// Batch fetch multiple authors by their IDs.
///
/// Returns a HashMap mapping AuthorId to Author.
/// Authors that don't exist will not be in the map.
pub fn batch_find(
    conn: &mut SqliteConnection,
    author_ids: &[AuthorId],
) -> Result<HashMap<AuthorId, Author>> {
    use crate::schema::authors::dsl::*;

    if author_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = author_ids.iter().map(|id| id.as_i32()).collect();

    let results: Vec<Author> = authors
        .filter(id.eq_any(&i32_ids))
        .select(Author::as_select())
        .load(conn)?;

    Ok(results
        .into_iter()
        .map(|author| (AuthorId(author.id), author))
        .collect())
}

// ============================================================================
// Book Relationships
// ============================================================================

/// Find all book IDs for an author.
pub fn find_books(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<Vec<BookId>> {
    use crate::schema::books_authors_link::dsl::*;

    let book_ids: Vec<i32> = books_authors_link
        .filter(author.eq(author_id.as_i32()))
        .select(book)
        .load(conn)?;

    Ok(book_ids.into_iter().map(BookId).collect())
}

/// Count how many books an author has.
pub fn count_books(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<usize> {
    use crate::schema::books_authors_link::dsl::*;

    let count: i64 = books_authors_link
        .filter(author.eq(author_id.as_i32()))
        .count()
        .get_result(conn)?;

    Ok(count as usize)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestFixtures;

    #[test]
    fn test_find_existing_author() {
        let mut fixtures = TestFixtures::new();
        let created_id = fixtures.create_author("Test Author");

        let found = find(fixtures.conn(), created_id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Test Author");
    }

    #[test]
    fn test_find_nonexistent_author() {
        let mut fixtures = TestFixtures::new();
        let found = find(fixtures.conn(), AuthorId(999)).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_find_by_name() {
        let mut fixtures = TestFixtures::new();
        fixtures.create_author("Jane Austen");

        let found = find_by_name(fixtures.conn(), "Jane Austen").unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().name, "Jane Austen");
    }

    #[test]
    fn test_find_by_name_not_found() {
        let mut fixtures = TestFixtures::new();
        let found = find_by_name(fixtures.conn(), "Nonexistent Author").unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_list_authors() {
        let mut fixtures = TestFixtures::new();
        fixtures.create_author("Author 1");
        fixtures.create_author("Author 2");
        fixtures.create_author("Author 3");

        let authors = list(fixtures.conn()).unwrap();
        assert_eq!(authors.len(), 3);
    }

    #[test]
    fn test_create_author() {
        let mut fixtures = TestFixtures::new();

        let new_author = NewAuthor {
            name: "New Author".to_string(),
            sort: Some("Author, New".to_string()),
            link: "".to_string(),
        };

        let created = create(fixtures.conn(), new_author).unwrap();
        assert_eq!(created.name, "New Author");
        assert!(created.id > 0);
    }

    #[test]
    fn test_create_if_missing_creates_new() {
        let mut fixtures = TestFixtures::new();

        let new_author = NewAuthor {
            name: "Unique Author".to_string(),
            sort: Some("Author, Unique".to_string()),
            link: "".to_string(),
        };

        let created = create_if_missing(fixtures.conn(), new_author).unwrap();
        assert_eq!(created.name, "Unique Author");
    }

    #[test]
    fn test_create_if_missing_returns_existing() {
        let mut fixtures = TestFixtures::new();
        let existing_id = fixtures.create_author("Existing Author");

        let new_author = NewAuthor {
            name: "Existing Author".to_string(),
            sort: Some("Author, Existing".to_string()),
            link: "".to_string(),
        };

        let result = create_if_missing(fixtures.conn(), new_author).unwrap();
        assert_eq!(result.id, existing_id.as_i32());
    }

    #[test]
    fn test_update_author() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Original Name");

        let update_data = UpdateAuthorData {
            name: Some("Updated Name".to_string()),
            sort: None,
            link: None,
        };

        let updated = update(fixtures.conn(), author_id, update_data).unwrap();
        assert_eq!(updated.name, "Updated Name");
    }

    #[test]
    fn test_delete_author_without_books() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Author to Delete");

        delete(fixtures.conn(), author_id).unwrap();

        let found = find(fixtures.conn(), author_id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_author_with_books_fails() {
        let mut fixtures = TestFixtures::new();
        let (book_id, author_id) = fixtures.create_book_with_author("Test Book", "Test Author");

        let result = delete(fixtures.conn(), author_id);
        assert!(result.is_err());

        match result.unwrap_err() {
            Error::AuthorHasBooks(id, count) => {
                assert_eq!(id, author_id);
                assert_eq!(count, 1);
            }
            _ => panic!("Expected AuthorHasBooks error"),
        }
    }

    #[test]
    fn test_delete_nonexistent_author() {
        let mut fixtures = TestFixtures::new();
        let result = delete(fixtures.conn(), AuthorId(999));
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), Error::AuthorNotFound(_)));
    }

    #[test]
    fn test_batch_find() {
        let mut fixtures = TestFixtures::new();
        let author1 = fixtures.create_author("Author 1");
        let author2 = fixtures.create_author("Author 2");
        let author3 = fixtures.create_author("Author 3");

        let authors = batch_find(fixtures.conn(), &[author1, author2, AuthorId(999)]).unwrap();

        assert_eq!(authors.len(), 2); // AuthorId(999) doesn't exist
        assert!(authors.contains_key(&author1));
        assert!(authors.contains_key(&author2));
        assert!(!authors.contains_key(&AuthorId(999)));
    }

    #[test]
    fn test_find_books() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Test Author");
        let book1 = fixtures.create_book("Book 1");
        let book2 = fixtures.create_book("Book 2");

        fixtures.link_author_to_book(book1, author_id);
        fixtures.link_author_to_book(book2, author_id);

        let books = find_books(fixtures.conn(), author_id).unwrap();
        assert_eq!(books.len(), 2);
        assert!(books.contains(&book1));
        assert!(books.contains(&book2));
    }

    #[test]
    fn test_count_books() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Test Author");
        let book1 = fixtures.create_book("Book 1");
        let book2 = fixtures.create_book("Book 2");

        fixtures.link_author_to_book(book1, author_id);
        fixtures.link_author_to_book(book2, author_id);

        let count = count_books(fixtures.conn(), author_id).unwrap();
        assert_eq!(count, 2);
    }

    #[test]
    fn test_count_books_zero() {
        let mut fixtures = TestFixtures::new();
        let author_id = fixtures.create_author("Author with no books");

        let count = count_books(fixtures.conn(), author_id).unwrap();
        assert_eq!(count, 0);
    }
}
