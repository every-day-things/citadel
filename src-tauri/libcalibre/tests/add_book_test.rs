mod common;

use common::{setup_empty_library, standard_test_book, DatabaseSnapshot};
use insta::assert_yaml_snapshot;

/// Test that adding a single book creates the expected database state.
/// This test captures the ENTIRE database, so it will catch any unexpected
/// tables or columns that Calibre might create.
#[test]
fn test_add_single_book_full_database() {
    let (_temp, mut client) = setup_empty_library();

    // Add a book via libcalibre
    let result = client.add_book(standard_test_book());
    assert!(result.is_ok(), "Failed to add book: {:?}", result.err());

    // Capture the entire database state
    let db_path = client.get_database_path();
    let snapshot = DatabaseSnapshot::capture(&db_path)
        .expect("Failed to capture database snapshot")
        .normalize();

    assert_yaml_snapshot!(snapshot);
}

/// Test that the empty library fixture has the expected initial state
#[test]
fn test_empty_library_state() {
    let (_temp, client) = setup_empty_library();

    let db_path = client.get_database_path();
    let snapshot = DatabaseSnapshot::capture(&db_path)
        .expect("Failed to capture database snapshot")
        .normalize();

    assert_yaml_snapshot!(snapshot);
}
