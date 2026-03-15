use libcalibre::util::get_db_path;
use libcalibre::{BookAdd, Library};
use std::collections::HashMap;
use std::path::PathBuf;
use tempfile::TempDir;

/// Setup a fresh empty Calibre library in a temporary directory with Library
pub fn setup_with_library() -> (TempDir, Library) {
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
    let library = Library::new(valid_path).expect("Failed to create Library");

    (temp_dir, library)
}

/// Standard test book used across tests
pub fn standard_test_book() -> BookAdd {
    BookAdd {
        title: "The Test Book".to_string(),
        author_names: vec!["John Doe".to_string()],
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
