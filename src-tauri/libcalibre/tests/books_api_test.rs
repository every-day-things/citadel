// Tests for BooksHandler API methods to improve code coverage
mod common;

use common::setup_with_client_v2;
use libcalibre::dtos::author::NewAuthorDto;
use libcalibre::{NewBook, UpdateBookData, UpsertBookIdentifier};

#[test]
fn test_create_book() {
    let (_temp, mut client) = setup_with_client_v2();
    let books_handler = client.books();

    let new_book = NewBook {
        title: "Test Book".to_string(),
        timestamp: None,
        pubdate: None,
        series_index: 1.0,
        flags: 1,
        has_cover: None,
    };

    let result = books_handler.create(new_book);
    assert!(result.is_ok());

    let book = result.unwrap();
    assert_eq!(book.title, "Test Book");
    assert!(book.id > 0);
    assert!(book.uuid.is_some());
}

#[test]
fn test_list_books_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let books_handler = client.books();

    let result = books_handler.list();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_list_books_with_data() {
    let (_temp, mut client) = setup_with_client_v2();
    let books_handler = client.books();

    // Create a few books
    books_handler
        .create(NewBook {
            title: "Book 1".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    books_handler
        .create(NewBook {
            title: "Book 2".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let result = books_handler.list();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 2);
}

#[test]
fn test_find_by_id_exists() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let created = books_handler
        .create(NewBook {
            title: "Findable Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let result = books_handler.find_by_id(created.id);
    assert!(result.is_ok());

    let found = result.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().title, "Findable Book");
}

#[test]
fn test_find_by_id_not_exists() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let result = books_handler.find_by_id(9999);
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[test]
fn test_update_book() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let created = books_handler
        .create(NewBook {
            title: "Original Title".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let update = UpdateBookData {
        title: Some("Updated Title".to_string()),
        author_sort: Some("Test Author".to_string()),
        ..Default::default()
    };

    let result = books_handler.update(created.id, update);
    assert!(result.is_ok());

    let updated = result.unwrap();
    assert_eq!(updated.title, "Updated Title");
    assert_eq!(updated.author_sort, Some("Test Author".to_string()));
}

#[test]
fn test_update_nonexistent_book() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let update = UpdateBookData {
        title: Some("Test".to_string()),
        ..Default::default()
    };

    let result = books_handler.update(9999, update);
    assert!(result.is_err());
}

#[test]
fn test_link_author_to_book() {
    let (_temp, mut client) = setup_with_client_v2();

    // Create a book
    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Create an author
    let author = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Test Author".to_string(),
            sortable_name: "Author, Test".to_string(),
            external_url: None,
        })
        .unwrap();

    // Link them
    let result = client.books().link_author_to_book(book.id, author.id);
    assert!(result.is_ok());
}

#[test]
fn test_find_author_ids_by_book_id() {
    let (_temp, mut client) = setup_with_client_v2();

    // Create a book
    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Create authors
    let author1 = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Author One".to_string(),
            sortable_name: "One, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let author2 = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Author Two".to_string(),
            sortable_name: "Two, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    // Link them
    client
        .books()
        .link_author_to_book(book.id, author1.id)
        .unwrap();
    client
        .books()
        .link_author_to_book(book.id, author2.id)
        .unwrap();

    // Find author IDs
    let result = client.books().find_author_ids_by_book_id(book.id);
    assert!(result.is_ok());

    let author_ids = result.unwrap();
    assert_eq!(author_ids.len(), 2);
    assert!(author_ids.contains(&author1.id));
    assert!(author_ids.contains(&author2.id));
}

#[test]
fn test_unlink_author_from_book() {
    let (_temp, mut client) = setup_with_client_v2();

    // Create a book and author
    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let author = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Test Author".to_string(),
            sortable_name: "Author, Test".to_string(),
            external_url: None,
        })
        .unwrap();

    // Link them
    client
        .books()
        .link_author_to_book(book.id, author.id)
        .unwrap();

    // Verify link
    let author_ids = client.books().find_author_ids_by_book_id(book.id).unwrap();
    assert_eq!(author_ids.len(), 1);

    // Unlink
    let result = client.books().unlink_author_from_book(book.id, author.id);
    assert!(result.is_ok());

    // Verify unlinked
    let author_ids = client.books().find_author_ids_by_book_id(book.id).unwrap();
    assert_eq!(author_ids.len(), 0);
}

#[test]
fn test_create_book_identifier() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let upsert = UpsertBookIdentifier {
        book_id: book.id,
        id: None,
        label: "ISBN".to_string(),
        value: "978-0-123456-78-9".to_string(),
    };

    let result = client.books().upsert_book_identifier(upsert);
    assert!(result.is_ok());
    assert!(result.unwrap() > 0);
}

#[test]
fn test_update_book_identifier() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Create identifier
    let identifier_id = client
        .books()
        .upsert_book_identifier(UpsertBookIdentifier {
            book_id: book.id,
            id: None,
            label: "ISBN".to_string(),
            value: "978-0-123456-78-9".to_string(),
        })
        .unwrap();

    // Update identifier
    let result = client.books().upsert_book_identifier(UpsertBookIdentifier {
        book_id: book.id,
        id: Some(identifier_id),
        label: "ISBN".to_string(),
        value: "978-0-987654-32-1".to_string(),
    });

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), identifier_id);
}

#[test]
fn test_list_identifiers_for_book() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Create identifiers
    client
        .books()
        .upsert_book_identifier(UpsertBookIdentifier {
            book_id: book.id,
            id: None,
            label: "ISBN".to_string(),
            value: "978-0-123456-78-9".to_string(),
        })
        .unwrap();

    client
        .books()
        .upsert_book_identifier(UpsertBookIdentifier {
            book_id: book.id,
            id: None,
            label: "ASIN".to_string(),
            value: "B00ABCDEFG".to_string(),
        })
        .unwrap();

    let result = client.books().list_identifiers_for_book(book.id);
    assert!(result.is_ok());

    let identifiers = result.unwrap();
    assert_eq!(identifiers.len(), 2);
}

#[test]
fn test_delete_book_identifier() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let identifier_id = client
        .books()
        .upsert_book_identifier(UpsertBookIdentifier {
            book_id: book.id,
            id: None,
            label: "ISBN".to_string(),
            value: "978-0-123456-78-9".to_string(),
        })
        .unwrap();

    let result = client
        .books()
        .delete_book_identifier(book.id, identifier_id);
    assert!(result.is_ok());

    // Verify deleted
    let identifiers = client.books().list_identifiers_for_book(book.id).unwrap();
    assert_eq!(identifiers.len(), 0);
}

#[test]
fn test_get_description_none() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let result = client.books().get_description(book.id);
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[test]
fn test_set_and_get_description() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let description = "This is a test book description.";

    let result = client.books().set_description(book.id, description);
    assert!(result.is_ok());

    let result = client.books().get_description(book.id);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), Some(description.to_string()));
}

#[test]
fn test_update_description() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Set initial description
    client
        .books()
        .set_description(book.id, "Original description")
        .unwrap();

    // Update description
    let updated_description = "Updated description";
    let result = client.books().set_description(book.id, updated_description);
    assert!(result.is_ok());

    let result = client.books().get_description(book.id);
    assert_eq!(result.unwrap(), Some(updated_description.to_string()));
}

#[test]
fn test_get_book_read_state_default() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let result = client.books().get_book_read_state(book.id);
    assert!(result.is_ok());
    // Default should be false
    assert_eq!(result.unwrap(), Some(false));
}

#[test]
fn test_set_and_get_book_read_state() {
    let (_temp, mut client) = setup_with_client_v2();

    let book = client
        .books()
        .create(NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    // Set as read
    let result = client.books().set_book_read_state(book.id, true);
    assert!(result.is_ok());

    let result = client.books().get_book_read_state(book.id);
    assert_eq!(result.unwrap(), Some(true));

    // Toggle to unread
    let result = client.books().set_book_read_state(book.id, false);
    assert!(result.is_ok());

    let result = client.books().get_book_read_state(book.id);
    assert_eq!(result.unwrap(), Some(false));
}

#[test]
fn test_batch_get_descriptions_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let result = books_handler.batch_get_descriptions(&[]);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_batch_get_descriptions() {
    let (_temp, mut client) = setup_with_client_v2();

    let book1 = client
        .books()
        .create(NewBook {
            title: "Book 1".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let book2 = client
        .books()
        .create(NewBook {
            title: "Book 2".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    client
        .books()
        .set_description(book1.id, "Description 1")
        .unwrap();
    client
        .books()
        .set_description(book2.id, "Description 2")
        .unwrap();

    let result = client.books().batch_get_descriptions(&[book1.id, book2.id]);
    assert!(result.is_ok());

    let descriptions = result.unwrap();
    assert_eq!(descriptions.len(), 2);
    assert_eq!(
        descriptions.get(&book1.id),
        Some(&"Description 1".to_string())
    );
    assert_eq!(
        descriptions.get(&book2.id),
        Some(&"Description 2".to_string())
    );
}

#[test]
fn test_batch_get_author_links_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let result = books_handler.batch_get_author_links(&[]);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_batch_get_author_links() {
    let (_temp, mut client) = setup_with_client_v2();

    let book1 = client
        .books()
        .create(NewBook {
            title: "Book 1".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let author1 = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Author 1".to_string(),
            sortable_name: "1, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let author2 = client
        .authors()
        .create(NewAuthorDto {
            full_name: "Author 2".to_string(),
            sortable_name: "2, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    client
        .books()
        .link_author_to_book(book1.id, author1.id)
        .unwrap();
    client
        .books()
        .link_author_to_book(book1.id, author2.id)
        .unwrap();

    let result = client.books().batch_get_author_links(&[book1.id]);
    assert!(result.is_ok());

    let links = result.unwrap();
    assert_eq!(links.len(), 1);
    assert_eq!(links.get(&book1.id).unwrap().len(), 2);
}

#[test]
fn test_batch_get_read_states_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let result = books_handler.batch_get_read_states(&[]);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_batch_get_read_states() {
    let (_temp, mut client) = setup_with_client_v2();

    let book1 = client
        .books()
        .create(NewBook {
            title: "Book 1".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    let book2 = client
        .books()
        .create(NewBook {
            title: "Book 2".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    client.books().set_book_read_state(book1.id, true).unwrap();
    client.books().set_book_read_state(book2.id, false).unwrap();

    let result = client.books().batch_get_read_states(&[book1.id, book2.id]);
    assert!(result.is_ok());

    let states = result.unwrap();
    assert_eq!(states.len(), 2);
    assert_eq!(states.get(&book1.id), Some(&true));
    assert_eq!(states.get(&book2.id), Some(&false));
}

#[test]
fn test_batch_get_identifiers_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut books_handler = client.books();

    let result = books_handler.batch_get_identifiers(&[]);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_batch_get_identifiers() {
    let (_temp, mut client) = setup_with_client_v2();

    let book1 = client
        .books()
        .create(NewBook {
            title: "Book 1".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        })
        .unwrap();

    client
        .books()
        .upsert_book_identifier(UpsertBookIdentifier {
            book_id: book1.id,
            id: None,
            label: "ISBN".to_string(),
            value: "978-0-123456-78-9".to_string(),
        })
        .unwrap();

    let result = client.books().batch_get_identifiers(&[book1.id]);
    assert!(result.is_ok());

    let identifiers = result.unwrap();
    assert_eq!(identifiers.len(), 1);
    assert_eq!(identifiers.get(&book1.id).unwrap().len(), 1);
}
