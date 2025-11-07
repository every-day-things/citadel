// Tests for database triggers that maintain data integrity
// These triggers match Calibre's behavior for auto-generating fields and cascade deletes

mod common;

use common::setup_with_calibre_client;
use diesel::prelude::*;
use diesel::sql_query;
use libcalibre::dtos::author::NewAuthorDto;
use libcalibre::dtos::book::NewBookDto;
use libcalibre::dtos::library::NewLibraryEntryDto;
use libcalibre::persistence::establish_connection;

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

    let book = client.add_book(book_entry).expect("Failed to add book");

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
    let (_temp, mut client) = setup_with_calibre_client();

    // Add a book
    let book_entry = NewLibraryEntryDto {
        book: NewBookDto {
            title: "Original Title".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        },
        authors: vec![NewAuthorDto {
            full_name: "Test Author".to_string(),
            sortable_name: "Author, Test".to_string(),
            external_url: None,
        }],
        files: None,
    };

    let book = client.add_book(book_entry).expect("Failed to add book");
    let book_id = book.id;

    // Update the title using raw SQL (since libcalibre doesn't expose title update via CalibreClient)
    // This directly tests the trigger
    let db_path = client.get_database_path();
    let mut conn = establish_connection(db_path.to_str().unwrap()).unwrap();

    sql_query("UPDATE books SET title = 'The New Title' WHERE id = ?")
        .bind::<diesel::sql_types::Integer, _>(book_id)
        .execute(&mut conn)
        .unwrap();

    // Fetch the updated book to verify sort was updated
    #[derive(QueryableByName)]
    struct BookSort {
        #[diesel(sql_type = diesel::sql_types::Nullable<diesel::sql_types::Text>)]
        sort: Option<String>,
    }

    let result: BookSort = sql_query("SELECT sort FROM books WHERE id = ?")
        .bind::<diesel::sql_types::Integer, _>(book_id)
        .get_result(&mut conn)
        .unwrap();

    // Verify sort was updated by trigger (moving "The" to the end)
    assert_eq!(result.sort, Some("New Title, The".to_string()));
}

/// Test that the books_delete_trg trigger cascades deletes to related tables
#[test]
fn test_books_delete_trigger_cascades() {
    let (_temp, mut client) = setup_with_calibre_client();

    // Add a book with related data
    let book_entry = NewLibraryEntryDto {
        book: NewBookDto {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        },
        authors: vec![NewAuthorDto {
            full_name: "Test Author".to_string(),
            sortable_name: "Author, Test".to_string(),
            external_url: None,
        }],
        files: None,
    };

    let book = client.add_book(book_entry).expect("Failed to add book");
    let book_id = book.id;

    // Add related data (comments, identifiers) using raw SQL
    let db_path = client.get_database_path();
    let mut conn = establish_connection(db_path.to_str().unwrap()).unwrap();

    sql_query("INSERT INTO comments (book, text) VALUES (?, 'Test comment')")
        .bind::<diesel::sql_types::Integer, _>(book_id)
        .execute(&mut conn)
        .unwrap();

    sql_query("INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', '1234567890')")
        .bind::<diesel::sql_types::Integer, _>(book_id)
        .execute(&mut conn)
        .unwrap();

    // Verify related records exist
    #[derive(QueryableByName)]
    struct CountResult {
        #[diesel(sql_type = diesel::sql_types::BigInt)]
        count: i64,
    }

    let link_count: CountResult =
        sql_query("SELECT COUNT(*) as count FROM books_authors_link WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        link_count.count, 1,
        "Should have 1 author link before delete"
    );

    let comment_count: CountResult =
        sql_query("SELECT COUNT(*) as count FROM comments WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        comment_count.count, 1,
        "Should have 1 comment before delete"
    );

    let identifier_count: CountResult =
        sql_query("SELECT COUNT(*) as count FROM identifiers WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        identifier_count.count, 1,
        "Should have 1 identifier before delete"
    );

    // Delete the book
    sql_query("DELETE FROM books WHERE id = ?")
        .bind::<diesel::sql_types::Integer, _>(book_id)
        .execute(&mut conn)
        .unwrap();

    // Verify all related records were cascade deleted by the trigger
    let link_count_after: CountResult =
        sql_query("SELECT COUNT(*) as count FROM books_authors_link WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        link_count_after.count, 0,
        "Author links should be cascade deleted"
    );

    let comment_count_after: CountResult =
        sql_query("SELECT COUNT(*) as count FROM comments WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        comment_count_after.count, 0,
        "Comments should be cascade deleted"
    );

    let identifier_count_after: CountResult =
        sql_query("SELECT COUNT(*) as count FROM identifiers WHERE book = ?")
            .bind::<diesel::sql_types::Integer, _>(book_id)
            .get_result(&mut conn)
            .unwrap();
    assert_eq!(
        identifier_count_after.count, 0,
        "Identifiers should be cascade deleted"
    );
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
