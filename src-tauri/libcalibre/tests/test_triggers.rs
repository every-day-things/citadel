// Tests for database triggers that maintain data integrity
// These triggers match Calibre's behavior for auto-generating fields and cascade deletes

mod common;

use common::{setup_with_calibre_client, setup_with_client_v2};
use libcalibre::dtos::author::NewAuthorDto;
use libcalibre::dtos::book::NewBookDto;
use libcalibre::dtos::library::NewLibraryEntryDto;
use libcalibre::{NewBook, UpdateBookData};

/// Test that the books_insert_trg trigger auto-generates sort and uuid fields
#[test]
fn test_books_insert_trigger_generates_sort_and_uuid() {
    let (_temp, mut client) = setup_with_calibre_client();

    // Add a book with a title that should be sorted
    let book_entry = NewLibraryEntryDto {
        book: NewBookDto {
            title: "The Great Gatsby".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        },
        authors: vec![NewAuthorDto {
            full_name: "F. Scott Fitzgerald".to_string(),
            sortable_name: "Fitzgerald, F. Scott".to_string(),
            external_url: None,
        }],
        files: None,
    };

    let book = client.add_book(book_entry).unwrap();

    // Verify sort field was generated (moving "The" to the end)
    assert_eq!(book.sortable_title, Some("Great Gatsby, The".to_string()));

    // Verify UUID was generated (should be a valid UUID format)
    assert!(book.uuid.is_some());
    let uuid = book.uuid.unwrap();
    assert_eq!(uuid.len(), 36); // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    assert!(uuid.contains('-'));
}

/// Test that the books_update_trg trigger updates sort when title changes
#[test]
fn test_books_update_trigger_updates_sort() {
    let (_temp, mut client) = setup_with_client_v2();

    // Create a book directly with ClientV2
    let new_book = NewBook {
        title: "Original Title".to_string(),
        timestamp: None,
        pubdate: None,
        series_index: 1.0,
        flags: 1,
        has_cover: None,
    };

    let book = client.books().create(new_book).unwrap();
    let book_id = book.id;

    // Verify initial sort
    assert_eq!(book.sort, Some("Original Title".to_string()));

    // Update the title using ClientV2
    let updated_book = client
        .books()
        .update(
            book_id,
            UpdateBookData {
                title: Some("The New Title".to_string()),
                ..Default::default()
            },
        )
        .unwrap();

    // Verify sort was updated by trigger (moving "The" to the end)
    assert_eq!(updated_book.sort, Some("New Title, The".to_string()));
}

/// Test that triggers work correctly with various article patterns
#[test]
fn test_title_sort_trigger_with_various_articles() {
    let (_temp, mut client) = setup_with_calibre_client();

    // Test with "The"
    let book1 = client
        .add_book(NewLibraryEntryDto {
            book: NewBookDto {
                title: "The Matrix".to_string(),
                timestamp: None,
                pubdate: None,
                series_index: 1.0,
                flags: 1,
                has_cover: None,
            },
            authors: vec![NewAuthorDto {
                full_name: "Author One".to_string(),
                sortable_name: "One, Author".to_string(),
                external_url: None,
            }],
            files: None,
        })
        .unwrap();

    // Test with "A"
    let book2 = client
        .add_book(NewLibraryEntryDto {
            book: NewBookDto {
                title: "A Tale of Two Cities".to_string(),
                timestamp: None,
                pubdate: None,
                series_index: 1.0,
                flags: 1,
                has_cover: None,
            },
            authors: vec![NewAuthorDto {
                full_name: "Author Two".to_string(),
                sortable_name: "Two, Author".to_string(),
                external_url: None,
            }],
            files: None,
        })
        .unwrap();

    // Test with "An"
    let book3 = client
        .add_book(NewLibraryEntryDto {
            book: NewBookDto {
                title: "An American Tragedy".to_string(),
                timestamp: None,
                pubdate: None,
                series_index: 1.0,
                flags: 1,
                has_cover: None,
            },
            authors: vec![NewAuthorDto {
                full_name: "Author Three".to_string(),
                sortable_name: "Three, Author".to_string(),
                external_url: None,
            }],
            files: None,
        })
        .unwrap();

    // Test without article
    let book4 = client
        .add_book(NewLibraryEntryDto {
            book: NewBookDto {
                title: "Moby Dick".to_string(),
                timestamp: None,
                pubdate: None,
                series_index: 1.0,
                flags: 1,
                has_cover: None,
            },
            authors: vec![NewAuthorDto {
                full_name: "Author Four".to_string(),
                sortable_name: "Four, Author".to_string(),
                external_url: None,
            }],
            files: None,
        })
        .unwrap();

    // Verify all sort fields were correctly generated by the trigger
    assert_eq!(book1.sortable_title, Some("Matrix, The".to_string()));
    assert_eq!(
        book2.sortable_title,
        Some("Tale of Two Cities, A".to_string())
    );
    assert_eq!(
        book3.sortable_title,
        Some("American Tragedy, An".to_string())
    );
    assert_eq!(book4.sortable_title, Some("Moby Dick".to_string()));
}

// TODO: Test cascade delete behavior when delete API is available
// The books_delete_trg trigger should cascade delete related records when a book is deleted.
// This test should verify that:
// - Deleting a book removes entries from books_authors_link
// - Deleting a book removes entries from books_publishers_link
// - Deleting a book removes entries from books_ratings_link
// - Deleting a book removes entries from books_series_link
// - Deleting a book removes entries from books_tags_link
// - Deleting a book removes entries from books_languages_link
// - Deleting a book removes entries from data (book files)
// - Deleting a book removes entries from comments
// - Deleting a book removes entries from conversion_options
// - Deleting a book removes entries from books_plugin_data
// - Deleting a book removes entries from identifiers
//
// Currently skipped because neither CalibreClient nor ClientV2 exposes book deletion API.
#[test]
#[ignore]
fn test_books_delete_trigger_cascades() {
    // TODO: Implement when delete_book() API is available
    todo!("Implement cascade delete test when delete API is available")
}
