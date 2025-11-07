mod common;

use common::{setup_with_calibre_client, setup_with_client_v2};
use libcalibre::dtos::author::{NewAuthorDto, UpdateAuthorDto};
use libcalibre::dtos::book::NewBookDto;
use libcalibre::dtos::library::NewLibraryEntryDto;

#[test]
fn test_list_authors_empty() {
    let (_temp, mut client) = setup_with_client_v2();
    let authors_handler = client.authors();

    let result = authors_handler.list();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_list_authors_with_data() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    // Create some authors
    authors_handler
        .create(NewAuthorDto {
            full_name: "Author One".to_string(),
            sortable_name: "One, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    authors_handler
        .create(NewAuthorDto {
            full_name: "Author Two".to_string(),
            sortable_name: "Two, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.list();
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 2);
}

#[test]
fn test_find_by_id_exists() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let created = authors_handler
        .create(NewAuthorDto {
            full_name: "Test Author".to_string(),
            sortable_name: "Author, Test".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.find_by_id(created.id);
    assert!(result.is_ok());
    let found = result.unwrap();
    assert!(found.is_some());
    assert_eq!(found.unwrap().name, "Test Author");
}

#[test]
fn test_find_by_id_not_found() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let result = authors_handler.find_by_id(9999);
    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[test]
fn test_update_author() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let created = authors_handler
        .create(NewAuthorDto {
            full_name: "Original Name".to_string(),
            sortable_name: "Name, Original".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.update(
        created.id,
        UpdateAuthorDto {
            full_name: Some("Updated Name".to_string()),
            sortable_name: Some("Name, Updated".to_string()),
            external_url: Some("https://example.com".to_string()),
        },
    );

    assert!(result.is_ok());
    let updated = result.unwrap();
    assert_eq!(updated.name, "Updated Name");
    assert_eq!(updated.sort, Some("Name, Updated".to_string()));
    assert_eq!(updated.link, "https://example.com");
}

#[test]
fn test_update_nonexistent_author() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let result = authors_handler.update(
        9999,
        UpdateAuthorDto {
            full_name: Some("Test".to_string()),
            sortable_name: None,
            external_url: None,
        },
    );

    assert!(result.is_err());
}

#[test]
fn test_delete_author_without_books() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let created = authors_handler
        .create(NewAuthorDto {
            full_name: "To Delete".to_string(),
            sortable_name: "Delete, To".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.delete(created.id);
    assert!(result.is_ok());

    // Verify it's deleted
    let find_result = authors_handler.find_by_id(created.id);
    assert!(find_result.is_ok());
    assert!(find_result.unwrap().is_none());
}

#[test]
fn test_delete_author_with_books_fails() {
    let (_temp, mut client) = setup_with_calibre_client();

    // Create a book with an author
    client
        .add_book(NewLibraryEntryDto {
            book: NewBookDto {
                title: "Test Book".to_string(),
                timestamp: None,
                pubdate: None,
                series_index: 1.0,
                flags: 1,
                has_cover: None,
            },
            authors: vec![NewAuthorDto {
                full_name: "Book Author".to_string(),
                sortable_name: "Author, Book".to_string(),
                external_url: None,
            }],
            files: None,
        })
        .unwrap();

    // Find the author and try to delete - need to use client_v2 here
    let db_path = client.get_database_path();
    let mut client_v2 = libcalibre::ClientV2::new(
        libcalibre::util::get_db_path(db_path.parent().unwrap().to_str().unwrap()).unwrap(),
    );
    let mut authors_handler = client_v2.authors();
    let author = authors_handler
        .find_by_name("Book Author")
        .unwrap()
        .unwrap();

    let result = authors_handler.delete(author.id);
    assert!(result.is_err());
}

#[test]
fn test_find_by_ids_empty_input() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let result = authors_handler.find_by_ids(&[]);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 0);
}

#[test]
fn test_find_by_ids_single() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let created = authors_handler
        .create(NewAuthorDto {
            full_name: "Single Author".to_string(),
            sortable_name: "Author, Single".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.find_by_ids(&[created.id]);
    assert!(result.is_ok());

    let map = result.unwrap();
    assert_eq!(map.len(), 1);
    assert!(map.contains_key(&created.id));
    assert_eq!(map[&created.id].name, "Single Author");
}

#[test]
fn test_find_by_ids_multiple() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let author1 = authors_handler
        .create(NewAuthorDto {
            full_name: "Author One".to_string(),
            sortable_name: "One, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let author2 = authors_handler
        .create(NewAuthorDto {
            full_name: "Author Two".to_string(),
            sortable_name: "Two, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let author3 = authors_handler
        .create(NewAuthorDto {
            full_name: "Author Three".to_string(),
            sortable_name: "Three, Author".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.find_by_ids(&[author1.id, author2.id, author3.id]);
    assert!(result.is_ok());

    let map = result.unwrap();
    assert_eq!(map.len(), 3);
    assert!(map.contains_key(&author1.id));
    assert!(map.contains_key(&author2.id));
    assert!(map.contains_key(&author3.id));
}

#[test]
fn test_find_by_ids_partial_match() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let created = authors_handler
        .create(NewAuthorDto {
            full_name: "Existing Author".to_string(),
            sortable_name: "Author, Existing".to_string(),
            external_url: None,
        })
        .unwrap();

    let result = authors_handler.find_by_ids(&[created.id, 8888, 9999]);
    assert!(result.is_ok());

    let map = result.unwrap();
    assert_eq!(map.len(), 1);
    assert!(map.contains_key(&created.id));
    assert!(!map.contains_key(&8888));
    assert!(!map.contains_key(&9999));
}

#[test]
fn test_create_if_missing_when_missing() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    let dto = NewAuthorDto {
        full_name: "New Author".to_string(),
        sortable_name: "Author, New".to_string(),
        external_url: None,
    };

    let result = authors_handler.create_if_missing(dto);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().name, "New Author");

    // Verify it was created
    let list = authors_handler.list().unwrap();
    assert_eq!(list.len(), 1);
}

#[test]
fn test_create_if_missing_when_exists() {
    let (_temp, mut client) = setup_with_client_v2();
    let mut authors_handler = client.authors();

    // Create first time
    let first = authors_handler
        .create(NewAuthorDto {
            full_name: "Existing Author".to_string(),
            sortable_name: "Author, Existing".to_string(),
            external_url: None,
        })
        .unwrap();

    // Try create_if_missing with same name
    let dto = NewAuthorDto {
        full_name: "Existing Author".to_string(),
        sortable_name: "Different Sort".to_string(),
        external_url: Some("https://example.com".to_string()),
    };

    let result = authors_handler.create_if_missing(dto);
    assert!(result.is_ok());
    let second = result.unwrap();

    // Should return the existing author
    assert_eq!(first.id, second.id);
    assert_eq!(second.name, "Existing Author");

    // Verify no duplicate was created
    let list = authors_handler.list().unwrap();
    assert_eq!(list.len(), 1);
}
