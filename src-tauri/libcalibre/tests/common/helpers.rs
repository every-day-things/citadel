use libcalibre::calibre_client::CalibreClient;
use libcalibre::dtos::author::NewAuthorDto;
use libcalibre::dtos::book::NewBookDto;
use libcalibre::dtos::library::NewLibraryEntryDto;
use libcalibre::util::get_db_path;
use std::path::PathBuf;
use tempfile::TempDir;

/// Setup a fresh empty Calibre library in a temporary directory
pub fn setup_empty_library() -> (TempDir, CalibreClient) {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("metadata.db");

    // Copy the empty Calibre library fixture
    let fixture_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("empty_library")
        .join("metadata.db");

    if !fixture_path.exists() {
        panic!(
            "Test fixture not found at {:?}\n\
             Generate this fixture using a real Calibre installation.\n\
             See tests/README.md for instructions.",
            fixture_path
        );
    }

    std::fs::copy(&fixture_path, &db_path).unwrap();

    let valid_path =
        get_db_path(temp_dir.path().to_str().unwrap()).expect("Failed to get valid DB path");
    let client = CalibreClient::new(valid_path);

    (temp_dir, client)
}

/// Standard test book DTO used across tests
pub fn standard_test_book() -> NewLibraryEntryDto {
    NewLibraryEntryDto {
        book: NewBookDto {
            title: "The Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            flags: 1,
            has_cover: None,
        },
        authors: vec![NewAuthorDto {
            full_name: "John Doe".to_string(),
            sortable_name: "Doe, John".to_string(),
            external_url: None,
        }],
        files: None,
    }
}
