//! Identifier query operations for book identifiers (ISBN, DOI, etc.).
//!
//! This module provides functions for managing book identifiers like ISBN, DOI, and other
//! external identification systems.

use crate::error::{Error, Result};
use crate::models::Identifier;
use crate::types::{BookId, IdentifierId};
use diesel::prelude::*;

// ============================================================================
// Core Operations
// ============================================================================

/// Find an identifier by its ID.
pub fn find(conn: &mut SqliteConnection, id: IdentifierId) -> Result<Option<Identifier>> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .filter(crate::schema::identifiers::id.eq(id.as_i32()))
        .select(Identifier::as_returning())
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// List all identifiers for a specific book.
pub fn list_for_book(conn: &mut SqliteConnection, book_id: BookId) -> Result<Vec<Identifier>> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .filter(book.eq(book_id.as_i32()))
        .select(Identifier::as_returning())
        .load(conn)
        .map_err(Error::from)
}

/// Find a specific identifier for a book by type (e.g., "isbn").
pub fn find_by_type(
    conn: &mut SqliteConnection,
    book_id: BookId,
    id_type: &str,
) -> Result<Option<Identifier>> {
    use crate::schema::identifiers::dsl::*;

    identifiers
        .filter(book.eq(book_id.as_i32()))
        .filter(type_.eq(id_type.to_lowercase()))
        .select(Identifier::as_returning())
        .first(conn)
        .optional()
        .map_err(Error::from)
}

/// Create a new identifier for a book.
///
/// The type will be automatically lowercased for consistency.
pub fn create(
    conn: &mut SqliteConnection,
    book_id: BookId,
    id_type: &str,
    value: &str,
) -> Result<Identifier> {
    use crate::schema::identifiers::dsl::*;

    diesel::insert_into(identifiers)
        .values((
            book.eq(book_id.as_i32()),
            type_.eq(id_type.to_lowercase()),
            val.eq(value),
        ))
        .returning(Identifier::as_returning())
        .get_result(conn)
        .map_err(Error::from)
}

/// Update an existing identifier's value.
pub fn update(
    conn: &mut SqliteConnection,
    identifier_id: IdentifierId,
    new_type: &str,
    new_value: &str,
) -> Result<Identifier> {
    use crate::schema::identifiers::dsl::*;

    diesel::update(identifiers.filter(crate::schema::identifiers::id.eq(identifier_id.as_i32())))
        .set((type_.eq(new_type.to_lowercase()), val.eq(new_value)))
        .returning(Identifier::as_returning())
        .get_result(conn)
        .map_err(Error::from)
}

/// Upsert an identifier: update if exists, create if not.
///
/// If `identifier_id` is Some, updates that identifier.
/// If `identifier_id` is None, creates a new identifier.
pub fn upsert(
    conn: &mut SqliteConnection,
    book_id: BookId,
    identifier_id: Option<IdentifierId>,
    id_type: &str,
    value: &str,
) -> Result<Identifier> {
    match identifier_id {
        Some(id) => update(conn, id, id_type, value),
        None => create(conn, book_id, id_type, value),
    }
}

/// Delete an identifier.
pub fn delete(
    conn: &mut SqliteConnection,
    book_id: BookId,
    identifier_id: IdentifierId,
) -> Result<()> {
    use crate::schema::identifiers::dsl::*;

    let rows_deleted = diesel::delete(
        identifiers
            .filter(book.eq(book_id.as_i32()))
            .filter(crate::schema::identifiers::id.eq(identifier_id.as_i32())),
    )
    .execute(conn)?;

    if rows_deleted == 0 {
        Err(Error::IdentifierNotFound(identifier_id))
    } else {
        Ok(())
    }
}

/// Delete all identifiers for a book.
pub fn delete_all_for_book(conn: &mut SqliteConnection, book_id: BookId) -> Result<usize> {
    use crate::schema::identifiers::dsl::*;

    let count = diesel::delete(identifiers.filter(book.eq(book_id.as_i32()))).execute(conn)?;

    Ok(count)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::TestFixtures;

    #[test]
    fn test_create_identifier() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        let identifier = create(fixtures.conn(), book_id, "isbn", "978-0-123456-78-9").unwrap();

        assert_eq!(identifier.book, book_id.as_i32());
        assert_eq!(identifier.type_, "isbn");
        assert_eq!(identifier.val, "978-0-123456-78-9");
    }

    #[test]
    fn test_create_identifier_lowercases_type() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        let identifier = create(fixtures.conn(), book_id, "ISBN", "978-0-123456-78-9").unwrap();

        assert_eq!(identifier.type_, "isbn"); // Should be lowercased
    }

    #[test]
    fn test_list_for_book() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        fixtures.add_identifier(book_id, "doi", "10.1234/example");

        let identifiers = list_for_book(fixtures.conn(), book_id).unwrap();
        assert_eq!(identifiers.len(), 2);
    }

    #[test]
    fn test_find_by_type() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        fixtures.add_identifier(book_id, "doi", "10.1234/example");

        let isbn = find_by_type(fixtures.conn(), book_id, "isbn").unwrap();
        assert!(isbn.is_some());
        assert_eq!(isbn.unwrap().val, "978-0-123456-78-9");

        let doi = find_by_type(fixtures.conn(), book_id, "doi").unwrap();
        assert!(doi.is_some());
        assert_eq!(doi.unwrap().val, "10.1234/example");
    }

    #[test]
    fn test_find_by_type_not_found() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        let result = find_by_type(fixtures.conn(), book_id, "isbn").unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_update_identifier() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        let original = find_by_type(fixtures.conn(), book_id, "isbn")
            .unwrap()
            .unwrap();

        let updated = update(
            fixtures.conn(),
            IdentifierId(original.id),
            "isbn",
            "978-0-987654-32-1",
        )
        .unwrap();

        assert_eq!(updated.val, "978-0-987654-32-1");
    }

    #[test]
    fn test_upsert_creates_new() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        let identifier = upsert(fixtures.conn(), book_id, None, "isbn", "978-0-123456-78-9").unwrap();

        assert_eq!(identifier.type_, "isbn");
        assert_eq!(identifier.val, "978-0-123456-78-9");
    }

    #[test]
    fn test_upsert_updates_existing() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        let original = find_by_type(fixtures.conn(), book_id, "isbn")
            .unwrap()
            .unwrap();

        let updated = upsert(
            fixtures.conn(),
            book_id,
            Some(IdentifierId(original.id)),
            "isbn",
            "978-0-987654-32-1",
        )
        .unwrap();

        assert_eq!(updated.id, original.id);
        assert_eq!(updated.val, "978-0-987654-32-1");
    }

    #[test]
    fn test_delete_identifier() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        let identifier = find_by_type(fixtures.conn(), book_id, "isbn")
            .unwrap()
            .unwrap();

        delete(fixtures.conn(), book_id, IdentifierId(identifier.id)).unwrap();

        let found = find_by_type(fixtures.conn(), book_id, "isbn").unwrap();
        assert!(found.is_none());
    }

    #[test]
    fn test_delete_nonexistent_identifier() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        let result = delete(fixtures.conn(), book_id, IdentifierId(999));
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            Error::IdentifierNotFound(_)
        ));
    }

    #[test]
    fn test_delete_all_for_book() {
        let mut fixtures = TestFixtures::new();
        let book_id = fixtures.create_book("Test Book");

        fixtures.add_identifier(book_id, "isbn", "978-0-123456-78-9");
        fixtures.add_identifier(book_id, "doi", "10.1234/example");

        let count = delete_all_for_book(fixtures.conn(), book_id).unwrap();
        assert_eq!(count, 2);

        let identifiers = list_for_book(fixtures.conn(), book_id).unwrap();
        assert_eq!(identifiers.len(), 0);
    }
}
