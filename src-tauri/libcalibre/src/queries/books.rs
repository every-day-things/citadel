//! Book query operations using idiomatic Rust patterns.
//!
//! This module provides functions for interacting with books in the Calibre database.
//! All functions accept a `&mut SqliteConnection` parameter and use type-safe IDs.

use crate::entities::book_row::{NewBook, UpdateBookData};
use crate::error::{Error, Result};
use crate::models::Identifier;
use crate::types::{AuthorId, BookId};
use crate::BookRow;
use diesel::prelude::*;
use std::collections::HashMap;

// ============================================================================
// Core CRUD Operations
// ============================================================================

/// Find a book by its ID.
///
/// Returns `Ok(Some(book))` if found, `Ok(None)` if not found.
///
/// # Example
///
/// ```ignore
/// let book = books::find(&mut conn, BookId(123))?;
/// ```
pub fn find(conn: &mut SqliteConnection, book_id: BookId) -> Result<Option<BookRow>> {
    use crate::schema::books::dsl::*;

    books
        .filter(id.eq(book_id.as_i32()))
        .select(BookRow::as_select())
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// List all books in the library.
///
/// Returns a vector of all book rows. For large libraries, consider using
/// pagination in the future.
pub fn list(conn: &mut SqliteConnection) -> Result<Vec<BookRow>> {
    use crate::schema::books::dsl::*;

    books
        .select(BookRow::as_select())
        .load(conn)
        .map_err(Error::from)
}

/// Create a new book.
///
/// Returns the created book with its assigned ID and UUID.
///
/// # Example
///
/// ```ignore
/// let new_book = NewBook {
///     title: "The Great Gatsby".to_string(),
///     timestamp: Some(Utc::now().naive_utc()),
///     pubdate: None,
///     series_index: 1.0,
///     flags: 1,
///     has_cover: Some(false),
/// };
/// let book = books::create(&mut conn, new_book)?;
/// ```
pub fn create(conn: &mut SqliteConnection, new_book: NewBook) -> Result<BookRow> {
    use crate::schema::books::dsl::*;

    let book = diesel::insert_into(books)
        .values(new_book)
        .returning(BookRow::as_returning())
        .get_result(conn)?;

    // SQLite doesn't add the UUID until after insert, so fetch it
    let book_uuid = uuid_for_book(conn, book.id)?;
    let mut book_with_uuid = book;
    book_with_uuid.uuid = book_uuid;

    Ok(book_with_uuid)
}

/// Update an existing book.
///
/// Returns the updated book, or an error if the book doesn't exist.
pub fn update(
    conn: &mut SqliteConnection,
    book_id: BookId,
    update_data: UpdateBookData,
) -> Result<BookRow> {
    use crate::schema::books::dsl::*;

    diesel::update(books.filter(id.eq(book_id.as_i32())))
        .set(update_data)
        .returning(BookRow::as_returning())
        .get_result(conn)
        .map_err(Error::from)
}

/// Delete a book by its ID.
///
/// Returns an error if the book doesn't exist.
pub fn delete(conn: &mut SqliteConnection, book_id: BookId) -> Result<()> {
    use crate::schema::books::dsl::*;

    let rows_deleted = diesel::delete(books.filter(id.eq(book_id.as_i32())))
        .execute(conn)?;

    if rows_deleted == 0 {
        Err(Error::BookNotFound(book_id))
    } else {
        Ok(())
    }
}

// ============================================================================
// Author Relationships
// ============================================================================

/// Find all author IDs linked to a book.
pub fn find_authors(conn: &mut SqliteConnection, book_id: BookId) -> Result<Vec<AuthorId>> {
    use crate::schema::books_authors_link::dsl::*;

    let author_ids: Vec<i32> = books_authors_link
        .filter(book.eq(book_id.as_i32()))
        .select(author)
        .load(conn)?;

    Ok(author_ids.into_iter().map(AuthorId).collect())
}

/// Link an author to a book.
///
/// Creates a many-to-many relationship between the book and author.
/// If the link already exists, this is a no-op.
pub fn link_author(
    conn: &mut SqliteConnection,
    book_id: BookId,
    author_id: AuthorId,
) -> Result<()> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::insert_into(books_authors_link)
        .values((book.eq(book_id.as_i32()), author.eq(author_id.as_i32())))
        .execute(conn)
        .map(|_| ())
        .map_err(Error::from)
}

/// Unlink an author from a book.
///
/// Removes the many-to-many relationship. If the link doesn't exist,
/// this is a no-op.
pub fn unlink_author(
    conn: &mut SqliteConnection,
    book_id: BookId,
    author_id: AuthorId,
) -> Result<()> {
    use crate::schema::books_authors_link::dsl::*;

    diesel::delete(
        books_authors_link
            .filter(book.eq(book_id.as_i32()))
            .filter(author.eq(author_id.as_i32())),
    )
    .execute(conn)
    .map(|_| ())
    .map_err(Error::from)
}

/// Replace all authors for a book.
///
/// Removes all existing author links and creates new ones.
/// This is more efficient than manually unlinking and relinking.
pub fn replace_authors(
    conn: &mut SqliteConnection,
    book_id: BookId,
    new_author_ids: &[AuthorId],
) -> Result<()> {
    use crate::schema::books_authors_link::dsl::*;

    // Remove all existing links
    diesel::delete(books_authors_link.filter(book.eq(book_id.as_i32()))).execute(conn)?;

    // Add new links
    if !new_author_ids.is_empty() {
        let values: Vec<_> = new_author_ids
            .iter()
            .map(|aid| (book.eq(book_id.as_i32()), author.eq(aid.as_i32())))
            .collect();

        diesel::insert_into(books_authors_link)
            .values(&values)
            .execute(conn)?;
    }

    Ok(())
}

// ============================================================================
// Identifiers (ISBN, etc.)
// ============================================================================

/// List all identifiers for a book.
pub fn list_identifiers(conn: &mut SqliteConnection, book_id: BookId) -> Result<Vec<Identifier>> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .filter(book.eq(book_id.as_i32()))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(Error::from)
}

// ============================================================================
// Descriptions
// ============================================================================

/// Get the description (HTML) for a book.
pub fn get_description(conn: &mut SqliteConnection, book_id: BookId) -> Result<Option<String>> {
    use crate::schema::comments::dsl::*;

    comments
        .filter(book.eq(book_id.as_i32()))
        .select(text)
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// Set or update the description for a book.
///
/// If a description already exists, it will be updated.
/// Otherwise, a new description will be created.
pub fn set_description(
    conn: &mut SqliteConnection,
    book_id: BookId,
    description: &str,
) -> Result<()> {
    use crate::schema::comments::dsl::*;

    // Check if a comment already exists
    let existing_id: Option<i32> = comments
        .filter(book.eq(book_id.as_i32()))
        .select(id)
        .first(conn)
        .optional()?;

    match existing_id {
        Some(comment_id) => {
            // Update existing
            diesel::update(comments.filter(id.eq(comment_id)))
                .set(text.eq(description))
                .execute(conn)?;
        }
        None => {
            // Insert new
            diesel::insert_into(comments)
                .values((book.eq(book_id.as_i32()), text.eq(description)))
                .execute(conn)?;
        }
    }

    Ok(())
}

// ============================================================================
// Batch Operations (for performance)
// ============================================================================

/// Batch fetch descriptions for multiple books.
///
/// Returns a HashMap mapping BookId to description text.
pub fn batch_get_descriptions(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, String>> {
    use crate::schema::comments::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|id| id.as_i32()).collect();

    let results: Vec<(i32, String)> = comments
        .filter(book.eq_any(&i32_ids))
        .select((book, text))
        .load(conn)?;

    Ok(results
        .into_iter()
        .map(|(id, txt)| (BookId(id), txt))
        .collect())
}

/// Batch fetch author links for multiple books.
///
/// Returns a HashMap mapping BookId to a Vec of AuthorIds.
pub fn batch_get_author_links(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, Vec<AuthorId>>> {
    use crate::schema::books_authors_link::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|id| id.as_i32()).collect();

    let results: Vec<(i32, i32)> = books_authors_link
        .filter(book.eq_any(&i32_ids))
        .select((book, author))
        .load(conn)?;

    // Group by book_id
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
pub fn batch_get_identifiers(
    conn: &mut SqliteConnection,
    book_ids: &[BookId],
) -> Result<HashMap<BookId, Vec<Identifier>>> {
    use crate::schema::identifiers::dsl::*;

    if book_ids.is_empty() {
        return Ok(HashMap::new());
    }

    let i32_ids: Vec<i32> = book_ids.iter().map(|id| id.as_i32()).collect();

    let results: Vec<Identifier> = identifiers
        .filter(book.eq_any(&i32_ids))
        .select(Identifier::as_returning())
        .load(conn)?;

    // Group by book_id
    let mut map: HashMap<BookId, Vec<Identifier>> = HashMap::new();
    for identifier in results {
        map.entry(BookId(identifier.book))
            .or_insert_with(Vec::new)
            .push(identifier);
    }

    Ok(map)
}

// ============================================================================
// Helper Functions
// ============================================================================

fn uuid_for_book(conn: &mut SqliteConnection, book_id: i32) -> Result<Option<String>> {
    use crate::schema::books::dsl::*;

    books
        .select(uuid)
        .filter(id.eq(book_id))
        .first::<Option<String>>(conn)
        .map_err(Error::from)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestFixtures;

    #[test]
    fn test_find_existing_book() {
        let mut fixtures = TestFixtures::new();
        let created_id = fixtures.create_book("Test Book");

        let found = find(fixtures.conn(), created_id).unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().title, "Test Book");
    }

    #[test]
    fn test_find_nonexistent_book() {
        let mut fixtures = TestFixtures::new();
        let found = find(fixtures.conn(), BookId(999)).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_list_books() {
        let mut fixtures = TestFixtures::new();
        fixtures.create_book("Book 1");
        fixtures.create_book("Book 2");
        fixtures.create_book("Book 3");

        let books = list(fixtures.conn()).unwrap();
        assert_eq!(books.len(), 3);
    }

    #[test]
    fn test_create_book() {
        let mut fixtures = TestFixtures::new();

        let new_book = NewBook {
            title: "New Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: Some(false),
        };

        let created = create(fixtures.conn(), new_book).unwrap();
        assert_eq!(created.title, "New Book");
        assert!(created.id > 0);
    }

    #[test]
    fn test_update_book() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Original Title");

        let update_data = UpdateBookData {
            title: Some("Updated Title".to_string()),
            author_sort: None,
            timestamp: None,
            pubdate: None,
            series_index: None,
            path: None,
            flags: None,
            has_cover: None,
        };

        let updated = update(fixtures.conn(), book_id, update_data).unwrap();
        assert_eq!(updated.title, "Updated Title");
    }

    #[test]
    fn test_delete_book() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Book to Delete");

        delete(fixtures.conn(), book_id).unwrap();

        let found = find(fixtures.conn(), book_id).unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_nonexistent_book() {
        let mut fixtures = TestFixtures::new();
        let result = delete(fixtures.conn(), BookId(999));
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), Error::BookNotFound(_)));
    }

    #[test]
    fn test_link_author() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        let author_id = fixtures.create_author("Test Author");

        link_author(fixtures.conn(), book_id, author_id).unwrap();

        let authors = find_authors(fixtures.conn(), book_id).unwrap();
        assert_eq!(authors.len(), 1);
        assert_eq!(authors[0], author_id);
    }

    #[test]
    fn test_unlink_author() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        let author_id = fixtures.create_author("Test Author");
        fixtures.link_author_to_book(book_id, author_id);

        unlink_author(fixtures.conn(), book_id, author_id).unwrap();

        let authors = find_authors(fixtures.conn(), book_id).unwrap();
        assert_eq!(authors.len(), 0);
    }

    #[test]
    fn test_replace_authors() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");
        let author1 = fixtures.create_author("Author 1");
        let author2 = fixtures.create_author("Author 2");
        let author3 = fixtures.create_author("Author 3");

        // Start with author1
        fixtures.link_author_to_book(book_id, author1);

        // Replace with author2 and author3
        replace_authors(fixtures.conn(), book_id, &[author2, author3]).unwrap();

        let authors = find_authors(fixtures.conn(), book_id).unwrap();
        assert_eq!(authors.len(), 2);
        assert!(authors.contains(&author2));
        assert!(authors.contains(&author3));
        assert!(!authors.contains(&author1));
    }

    #[test]
    fn test_get_set_description() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        // Initially no description
        let desc = get_description(fixtures.conn(), book_id).unwrap();
        assert!(desc.is_none());

        // Set description
        set_description(fixtures.conn(), book_id, "Test description").unwrap();

        // Verify it was set
        let desc = get_description(fixtures.conn(), book_id).unwrap();
        assert_eq!(desc, Some("Test description".to_string()));

        // Update description
        set_description(fixtures.conn(), book_id, "Updated description").unwrap();

        // Verify it was updated
        let desc = get_description(fixtures.conn(), book_id).unwrap();
        assert_eq!(desc, Some("Updated description".to_string()));
    }

    #[test]
    fn test_batch_get_descriptions() {
        let mut fixtures = TestFixtures::new();
        let book1 = fixtures.create_book("Book 1");
        let book2 = fixtures.create_book("Book 2");
        let book3 = fixtures.create_book("Book 3");

        fixtures.set_description(book1, "Description 1");
        fixtures.set_description(book3, "Description 3");

        let descriptions =
            batch_get_descriptions(fixtures.conn(), &[book1, book2, book3]).unwrap();

        assert_eq!(descriptions.len(), 2); // book2 has no description
        assert_eq!(descriptions.get(&book1), Some(&"Description 1".to_string()));
        assert_eq!(descriptions.get(&book3), Some(&"Description 3".to_string()));
        assert_eq!(descriptions.get(&book2), None);
    }

    #[test]
    fn test_batch_get_author_links() {
        let mut fixtures = TestFixtures::new();
        let book1 = fixtures.create_book("Book 1");
        let book2 = fixtures.create_book("Book 2");
        let author1 = fixtures.create_author("Author 1");
        let author2 = fixtures.create_author("Author 2");

        fixtures.link_author_to_book(book1, author1);
        fixtures.link_author_to_book(book2, author1);
        fixtures.link_author_to_book(book2, author2);

        let links = batch_get_author_links(fixtures.conn(), &[book1, book2]).unwrap();

        assert_eq!(links.get(&book1).unwrap().len(), 1);
        assert_eq!(links.get(&book2).unwrap().len(), 2);
    }
}
