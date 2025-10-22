//! Integration tests for the new query module API.
//!
//! These tests demonstrate the idiomatic Rust API using:
//! - Module functions instead of handler structs
//! - Type-safe IDs (BookId, AuthorId, etc.)
//! - Direct connection passing
//! - Proper error handling

mod common;

use common::*;
use libcalibre::entities::author::NewAuthor;
use libcalibre::entities::book_row::{NewBook, UpdateBookData};
use libcalibre::queries::{authors, books, identifiers};
use libcalibre::types::{AuthorId, BookId, IdentifierId};

// ============================================================================
// Books Module Tests
// ============================================================================

#[test]
fn test_books_find() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    let found = books::find(&mut conn, book_id).unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().title, "Test Book");
}

#[test]
fn test_books_list() {
    let mut conn = setup_test_db();
    create_test_book(&mut conn, "Book 1");
    create_test_book(&mut conn, "Book 2");

    let all_books = books::list(&mut conn).unwrap();
    assert_eq!(all_books.len(), 2);
}

#[test]
fn test_books_create() {
    let mut conn = setup_test_db();

    let new_book = NewBook {
        title: "New Book".to_string(),
        timestamp: None,
        pubdate: None,
        series_index: 1.0,
        flags: 1,
        has_cover: Some(false),
    };

    let created = books::create(&mut conn, new_book).unwrap();
    assert_eq!(created.title, "New Book");
    assert!(created.id > 0);
}

#[test]
fn test_books_update() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Original Title");

    let update = UpdateBookData {
        title: Some("Updated Title".to_string()),
        author_sort: None,
        timestamp: None,
        pubdate: None,
        series_index: None,
        path: None,
        flags: None,
        has_cover: None,
    };

    let updated = books::update(&mut conn, book_id, update).unwrap();
    assert_eq!(updated.title, "Updated Title");
}

#[test]
fn test_books_delete() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Book to Delete");

    books::delete(&mut conn, book_id).unwrap();

    let found = books::find(&mut conn, book_id).unwrap();
    assert!(found.is_none());
}

#[test]
fn test_books_link_unlink_author() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");
    let author_id = create_test_author(&mut conn, "Test Author");

    // Link
    books::link_author(&mut conn, book_id, author_id).unwrap();

    let author_ids = books::find_authors(&mut conn, book_id).unwrap();
    assert_eq!(author_ids.len(), 1);
    assert_eq!(author_ids[0], author_id);

    // Unlink
    books::unlink_author(&mut conn, book_id, author_id).unwrap();

    let author_ids = books::find_authors(&mut conn, book_id).unwrap();
    assert_eq!(author_ids.len(), 0);
}

#[test]
fn test_books_replace_authors() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");
    let author1 = create_test_author(&mut conn, "Author 1");
    let author2 = create_test_author(&mut conn, "Author 2");
    let author3 = create_test_author(&mut conn, "Author 3");

    // Start with author1
    books::link_author(&mut conn, book_id, author1).unwrap();

    // Replace with author2 and author3
    books::replace_authors(&mut conn, book_id, &[author2, author3]).unwrap();

    let author_ids = books::find_authors(&mut conn, book_id).unwrap();
    assert_eq!(author_ids.len(), 2);
    assert!(author_ids.contains(&author2));
    assert!(author_ids.contains(&author3));
    assert!(!author_ids.contains(&author1));
}

#[test]
fn test_books_description() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    // No description initially
    let desc = books::get_description(&mut conn, book_id).unwrap();
    assert!(desc.is_none());

    // Set description
    books::set_description(&mut conn, book_id, "A great book").unwrap();

    let desc = books::get_description(&mut conn, book_id).unwrap();
    assert_eq!(desc, Some("A great book".to_string()));

    // Update description
    books::set_description(&mut conn, book_id, "An amazing book").unwrap();

    let desc = books::get_description(&mut conn, book_id).unwrap();
    assert_eq!(desc, Some("An amazing book".to_string()));
}

#[test]
fn test_books_batch_operations() {
    let mut conn = setup_test_db();

    let book1 = create_test_book(&mut conn, "Book 1");
    let book2 = create_test_book(&mut conn, "Book 2");
    let author1 = create_test_author(&mut conn, "Author 1");

    books::set_description(&mut conn, book1, "Description 1").unwrap();
    books::link_author(&mut conn, book1, author1).unwrap();

    // Batch get descriptions
    let descriptions = books::batch_get_descriptions(&mut conn, &[book1, book2]).unwrap();
    assert_eq!(descriptions.len(), 1);
    assert_eq!(
        descriptions.get(&book1),
        Some(&"Description 1".to_string())
    );

    // Batch get author links
    let links = books::batch_get_author_links(&mut conn, &[book1, book2]).unwrap();
    assert_eq!(links.get(&book1).unwrap().len(), 1);
}

// ============================================================================
// Authors Module Tests
// ============================================================================

#[test]
fn test_authors_find() {
    let mut conn = setup_test_db();
    let author_id = create_test_author(&mut conn, "Test Author");

    let found = authors::find(&mut conn, author_id).unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().name, "Test Author");
}

#[test]
fn test_authors_find_by_name() {
    let mut conn = setup_test_db();
    create_test_author(&mut conn, "Jane Austen");

    let found = authors::find_by_name(&mut conn, "Jane Austen").unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().name, "Jane Austen");
}

#[test]
fn test_authors_list() {
    let mut conn = setup_test_db();
    create_test_author(&mut conn, "Author 1");
    create_test_author(&mut conn, "Author 2");

    let all_authors = authors::list(&mut conn).unwrap();
    assert_eq!(all_authors.len(), 2);
}

#[test]
fn test_authors_create() {
    let mut conn = setup_test_db();

    let new_author = NewAuthor {
        name: "New Author".to_string(),
        sort: Some("Author, New".to_string()),
        link: "".to_string(),
    };

    let created = authors::create(&mut conn, new_author).unwrap();
    assert_eq!(created.name, "New Author");
    assert!(created.id > 0);
}

#[test]
fn test_authors_create_if_missing() {
    let mut conn = setup_test_db();

    let new_author = NewAuthor {
        name: "Unique Author".to_string(),
        sort: None,
        link: "".to_string(),
    };

    // First call creates
    let created = authors::create_if_missing(&mut conn, new_author.clone()).unwrap();
    let first_id = created.id;

    // Second call returns existing
    let existing = authors::create_if_missing(&mut conn, new_author).unwrap();
    assert_eq!(existing.id, first_id);
}

#[test]
fn test_authors_delete_without_books() {
    let mut conn = setup_test_db();
    let author_id = create_test_author(&mut conn, "Author to Delete");

    authors::delete(&mut conn, author_id).unwrap();

    let found = authors::find(&mut conn, author_id).unwrap();
    assert!(found.is_none());
}

#[test]
fn test_authors_delete_with_books_fails() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");
    let author_id = create_test_author(&mut conn, "Test Author");
    link_author_to_book(&mut conn, book_id, author_id);

    let result = authors::delete(&mut conn, author_id);
    assert!(result.is_err());

    // Author should still exist
    let found = authors::find(&mut conn, author_id).unwrap();
    assert!(found.is_some());
}

#[test]
fn test_authors_find_books() {
    let mut conn = setup_test_db();
    let author_id = create_test_author(&mut conn, "Test Author");
    let book1 = create_test_book(&mut conn, "Book 1");
    let book2 = create_test_book(&mut conn, "Book 2");

    link_author_to_book(&mut conn, book1, author_id);
    link_author_to_book(&mut conn, book2, author_id);

    let books = authors::find_books(&mut conn, author_id).unwrap();
    assert_eq!(books.len(), 2);
    assert!(books.contains(&book1));
    assert!(books.contains(&book2));
}

#[test]
fn test_authors_count_books() {
    let mut conn = setup_test_db();
    let author_id = create_test_author(&mut conn, "Test Author");
    let book1 = create_test_book(&mut conn, "Book 1");
    let book2 = create_test_book(&mut conn, "Book 2");

    link_author_to_book(&mut conn, book1, author_id);
    link_author_to_book(&mut conn, book2, author_id);

    let count = authors::count_books(&mut conn, author_id).unwrap();
    assert_eq!(count, 2);
}

#[test]
fn test_authors_batch_find() {
    let mut conn = setup_test_db();
    let author1 = create_test_author(&mut conn, "Author 1");
    let author2 = create_test_author(&mut conn, "Author 2");

    let authors_map = authors::batch_find(&mut conn, &[author1, author2, AuthorId(999)]).unwrap();

    assert_eq!(authors_map.len(), 2);
    assert!(authors_map.contains_key(&author1));
    assert!(authors_map.contains_key(&author2));
    assert!(!authors_map.contains_key(&AuthorId(999)));
}

// ============================================================================
// Identifiers Module Tests
// ============================================================================

#[test]
fn test_identifiers_create() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    let identifier = identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();

    assert_eq!(identifier.book, book_id.as_i32());
    assert_eq!(identifier.type_, "isbn");
    assert_eq!(identifier.val, "978-0-123456-78-9");
}

#[test]
fn test_identifiers_list_for_book() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();
    identifiers::create(&mut conn, book_id, "doi", "10.1234/example").unwrap();

    let all_identifiers = identifiers::list_for_book(&mut conn, book_id).unwrap();
    assert_eq!(all_identifiers.len(), 2);
}

#[test]
fn test_identifiers_find_by_type() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();

    let found = identifiers::find_by_type(&mut conn, book_id, "isbn").unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().val, "978-0-123456-78-9");
}

#[test]
fn test_identifiers_update() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    let created = identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();

    let updated = identifiers::update(
        &mut conn,
        IdentifierId(created.id),
        "isbn",
        "978-0-987654-32-1",
    )
    .unwrap();

    assert_eq!(updated.val, "978-0-987654-32-1");
}

#[test]
fn test_identifiers_upsert() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    // Create new
    let created = identifiers::upsert(&mut conn, book_id, None, "isbn", "978-0-123456-78-9").unwrap();

    // Update existing
    let updated = identifiers::upsert(
        &mut conn,
        book_id,
        Some(IdentifierId(created.id)),
        "isbn",
        "978-0-987654-32-1",
    )
    .unwrap();

    assert_eq!(updated.id, created.id);
    assert_eq!(updated.val, "978-0-987654-32-1");
}

#[test]
fn test_identifiers_delete() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    let created = identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();

    identifiers::delete(&mut conn, book_id, IdentifierId(created.id)).unwrap();

    let found = identifiers::find_by_type(&mut conn, book_id, "isbn").unwrap();
    assert!(found.is_none());
}

#[test]
fn test_identifiers_delete_all_for_book() {
    let mut conn = setup_test_db();
    let book_id = create_test_book(&mut conn, "Test Book");

    identifiers::create(&mut conn, book_id, "isbn", "978-0-123456-78-9").unwrap();
    identifiers::create(&mut conn, book_id, "doi", "10.1234/example").unwrap();

    let count = identifiers::delete_all_for_book(&mut conn, book_id).unwrap();
    assert_eq!(count, 2);

    let all_identifiers = identifiers::list_for_book(&mut conn, book_id).unwrap();
    assert_eq!(all_identifiers.len(), 0);
}

// ============================================================================
// End-to-End Workflow Tests
// ============================================================================

#[test]
fn test_complete_book_workflow() {
    let mut conn = setup_test_db();

    // Create an author
    let author = authors::create(
        &mut conn,
        NewAuthor {
            name: "F. Scott Fitzgerald".to_string(),
            sort: Some("Fitzgerald, F. Scott".to_string()),
            link: "".to_string(),
        },
    )
    .unwrap();

    // Create a book
    let book = books::create(
        &mut conn,
        NewBook {
            title: "The Great Gatsby".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: Some(false),
        },
    )
    .unwrap();

    let book_id = BookId(book.id);
    let author_id = AuthorId(author.id);

    // Link author to book
    books::link_author(&mut conn, book_id, author_id).unwrap();

    // Add description
    books::set_description(&mut conn, book_id, "A classic American novel").unwrap();

    // Add ISBN
    identifiers::create(&mut conn, book_id, "isbn", "978-0-7432-7356-5").unwrap();

    // Verify everything
    let found_book = books::find(&mut conn, book_id).unwrap().unwrap();
    assert_eq!(found_book.title, "The Great Gatsby");

    let book_authors = books::find_authors(&mut conn, book_id).unwrap();
    assert_eq!(book_authors.len(), 1);
    assert_eq!(book_authors[0], author_id);

    let description = books::get_description(&mut conn, book_id).unwrap();
    assert_eq!(description, Some("A classic American novel".to_string()));

    let isbn = identifiers::find_by_type(&mut conn, book_id, "isbn")
        .unwrap()
        .unwrap();
    assert_eq!(isbn.val, "978-0-7432-7356-5");
}
