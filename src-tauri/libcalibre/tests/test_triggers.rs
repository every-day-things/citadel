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

// TODO: Test books_update_trg trigger when API properly refetches after update
// The books_update_trg trigger should update the sort field when a book's title changes.
// This test should verify that updating a book's title from "Original Title" to "The New Title"
// results in sort being updated to "New Title, The".
//
// Currently skipped because:
// - The AFTER UPDATE trigger fires after the RETURNING clause in ClientV2.books().update()
// - The returned BookRow doesn't include trigger-generated changes
// - Would need to refetch the book after update to see trigger effects
// - User requested no SQL queries in tests
//
// When a higher-level API method exists that refetches after update, this test can be implemented.
#[test]
#[ignore]
fn test_books_update_trigger_updates_sort() {
    // TODO: Implement when API refetches book after update
    todo!("Implement update trigger test when API properly refetches")
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
