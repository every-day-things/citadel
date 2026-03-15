// Tests for Library book API methods
mod common;

use common::setup_with_library;
use libcalibre::{AuthorAdd, BookAdd, BookId, BookUpdate};
use std::collections::HashMap;

fn empty_book(title: &str) -> BookAdd {
    BookAdd {
        title: title.to_string(),
        author_names: vec![],
        tags: None,
        series: None,
        series_index: None,
        publisher: None,
        publication_date: None,
        rating: None,
        comments: None,
        identifiers: HashMap::new(),
        file_paths: vec![],
    }
}

fn empty_update() -> BookUpdate {
    BookUpdate {
        title: None,
        author_names: None,
        author_ids: None,
        description: None,
        is_read: None,
        tags: None,
        series: None,
        series_index: None,
        publisher: None,
        publication_date: None,
        rating: None,
        comments: None,
        identifiers: None,
    }
}

#[test]
fn test_add_book() {
    let (_temp, mut lib) = setup_with_library();

    let result = lib.add_book(empty_book("Test Book"));
    assert!(result.is_ok());

    let book = result.unwrap();
    assert_eq!(book.title, "Test Book");
    assert!(!book.uuid.is_empty());
}

#[test]
fn test_list_books_empty() {
    let (_temp, mut lib) = setup_with_library();

    let result = lib.books();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_list_books_with_data() {
    let (_temp, mut lib) = setup_with_library();

    lib.add_book(empty_book("Book 1")).unwrap();
    lib.add_book(empty_book("Book 2")).unwrap();

    let result = lib.books();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 2);
}

#[test]
fn test_get_book_exists() {
    let (_temp, mut lib) = setup_with_library();

    let created = lib.add_book(empty_book("Findable Book")).unwrap();

    let result = lib.get_book(created.id);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().title, "Findable Book");
}

#[test]
fn test_get_book_not_exists() {
    let (_temp, mut lib) = setup_with_library();

    let result = lib.get_book(BookId::from(9999));
    assert!(result.is_err());
}

#[test]
fn test_update_book_title() {
    let (_temp, mut lib) = setup_with_library();

    let created = lib.add_book(empty_book("Original Title")).unwrap();

    let result = lib.update_book(
        created.id,
        BookUpdate {
            title: Some("Updated Title".to_string()),
            ..empty_update()
        },
    );
    assert!(result.is_ok());
    assert_eq!(result.unwrap().title, "Updated Title");
}

#[test]
fn test_update_nonexistent_book() {
    let (_temp, mut lib) = setup_with_library();

    let result = lib.update_book(
        BookId::from(9999),
        BookUpdate {
            title: Some("Test".to_string()),
            ..empty_update()
        },
    );
    assert!(result.is_err());
}

#[test]
fn test_update_book_authors_by_id() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();

    // Create authors
    let author1_id = lib
        .add_author(AuthorAdd {
            name: "Author One".to_string(),
            sort: Some("One, Author".to_string()),
            link: None,
        })
        .unwrap();

    let author2_id = lib
        .add_author(AuthorAdd {
            name: "Author Two".to_string(),
            sort: Some("Two, Author".to_string()),
            link: None,
        })
        .unwrap();

    // Link authors to book via update
    let updated = lib
        .update_book(
            book.id,
            BookUpdate {
                author_ids: Some(vec![author1_id, author2_id]),
                ..empty_update()
            },
        )
        .unwrap();

    assert_eq!(updated.authors.len(), 2);
}

#[test]
fn test_update_book_description() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();
    assert!(book.description.is_none());

    let updated = lib
        .update_book(
            book.id,
            BookUpdate {
                description: Some("A great book.".to_string()),
                ..empty_update()
            },
        )
        .unwrap();
    assert_eq!(updated.description, Some("A great book.".to_string()));

    // Verify via get_book
    let fetched = lib.get_book(book.id).unwrap();
    assert_eq!(fetched.description, Some("A great book.".to_string()));
}

#[test]
fn test_update_book_read_state() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();
    assert!(!book.is_read);

    // Mark as read
    let updated = lib
        .update_book(
            book.id,
            BookUpdate {
                is_read: Some(true),
                ..empty_update()
            },
        )
        .unwrap();
    assert!(updated.is_read);

    // Verify via get_book
    let fetched = lib.get_book(book.id).unwrap();
    assert!(fetched.is_read);

    // Mark as unread
    let updated = lib
        .update_book(
            book.id,
            BookUpdate {
                is_read: Some(false),
                ..empty_update()
            },
        )
        .unwrap();
    assert!(!updated.is_read);
}

#[test]
fn test_upsert_book_identifier_create() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();

    let result = lib.upsert_book_identifier(
        book.id,
        "ISBN".to_string(),
        "978-0-123456-78-9".to_string(),
        None,
    );
    assert!(result.is_ok());

    // Verify via get_book
    let fetched = lib.get_book(book.id).unwrap();
    assert_eq!(fetched.identifiers.len(), 1);
    assert_eq!(fetched.identifiers[0].label, "isbn"); // Calibre stores labels lowercase
    assert_eq!(fetched.identifiers[0].value, "978-0-123456-78-9");
}

#[test]
fn test_upsert_book_identifier_update() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();

    // Create
    lib.upsert_book_identifier(
        book.id,
        "ISBN".to_string(),
        "978-0-123456-78-9".to_string(),
        None,
    )
    .unwrap();

    let fetched = lib.get_book(book.id).unwrap();
    let identifier_id = fetched.identifiers[0].id;

    // Update
    lib.upsert_book_identifier(
        book.id,
        "ISBN".to_string(),
        "978-0-987654-32-1".to_string(),
        Some(identifier_id),
    )
    .unwrap();

    let fetched = lib.get_book(book.id).unwrap();
    assert_eq!(fetched.identifiers.len(), 1);
    assert_eq!(fetched.identifiers[0].value, "978-0-987654-32-1");
}

#[test]
fn test_delete_book_identifier() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib.add_book(empty_book("Test Book")).unwrap();

    lib.upsert_book_identifier(
        book.id,
        "ISBN".to_string(),
        "978-0-123456-78-9".to_string(),
        None,
    )
    .unwrap();

    let fetched = lib.get_book(book.id).unwrap();
    let identifier_id = fetched.identifiers[0].id;

    let result = lib.delete_book_identifier(book.id, identifier_id);
    assert!(result.is_ok());

    // Verify deleted
    let fetched = lib.get_book(book.id).unwrap();
    assert_eq!(fetched.identifiers.len(), 0);
}

#[test]
fn test_remove_books() {
    let (_temp, mut lib) = setup_with_library();

    let book1 = lib.add_book(empty_book("Book 1")).unwrap();
    let book2 = lib.add_book(empty_book("Book 2")).unwrap();

    assert_eq!(lib.books().unwrap().len(), 2);

    lib.remove_books(vec![book1.id, book2.id]).unwrap();

    assert_eq!(lib.books().unwrap().len(), 0);
}

#[test]
fn test_add_book_with_authors() {
    let (_temp, mut lib) = setup_with_library();

    let book = lib
        .add_book(BookAdd {
            title: "Multi-Author Book".to_string(),
            author_names: vec!["Author One".to_string(), "Author Two".to_string()],
            tags: None,
            series: None,
            series_index: None,
            publisher: None,
            publication_date: None,
            rating: None,
            comments: None,
            identifiers: HashMap::new(),
            file_paths: vec![],
        })
        .unwrap();

    assert_eq!(book.authors.len(), 2);
    assert_eq!(lib.authors().unwrap().len(), 2);
}

#[test]
fn test_books_returns_read_state() {
    let (_temp, mut lib) = setup_with_library();

    let book1 = lib.add_book(empty_book("Book 1")).unwrap();
    let book2 = lib.add_book(empty_book("Book 2")).unwrap();

    lib.update_book(
        book1.id,
        BookUpdate {
            is_read: Some(true),
            ..empty_update()
        },
    )
    .unwrap();

    let all_books = lib.books().unwrap();
    let b1 = all_books.iter().find(|b| b.id == book1.id).unwrap();
    let b2 = all_books.iter().find(|b| b.id == book2.id).unwrap();

    assert!(b1.is_read);
    assert!(!b2.is_read);
}
