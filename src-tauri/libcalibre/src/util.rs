use std::path::Path;

/// For a given library root root directory, return the path to the SQLite
/// database if the file is accessible.
pub fn get_db_path(library_root: &str) -> Option<String> {
    let db_path = Path::new(library_root).join("metadata.db");
    if db_path.exists() {
        db_path.to_str().map(|s| s.to_string())
    } else {
        None
    }
}
