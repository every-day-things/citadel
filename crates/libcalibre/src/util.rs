use std::path::Path;

#[derive(Clone)]
pub struct ValidDbPath {
    pub(crate) library_path: String,
    pub(crate) database_path: String,
}

/// For a given library root root directory, return the path to the SQLite
/// database if the file is accessible.
pub fn get_db_path(library_root: &str) -> Option<ValidDbPath> {
    let db_path = Path::new(library_root).join("metadata.db");
    if db_path.exists() {
        Some(ValidDbPath {
            database_path: db_path.to_str().map(|s| s.to_string())?,
            library_path: library_root.to_string(),
        })
    } else {
        None
    }
}
