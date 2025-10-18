use std::path::Path;

use libcalibre::mime_type::MIMETYPE;

use crate::book::{ImportableBookMetadata, LibraryAuthor};
use crate::calibre::book;
use crate::libs::file_formats;
use crate::{book::LibraryBook, state::CitadelState};

use super::ImportableFile;

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_books(
    state: tauri::State<CitadelState>,
) -> Result<Vec<LibraryBook>, String> {
    let library_root = state
        .get_library_path()
        .ok_or("No library loaded".to_string())?;

    state.with_client(|client| book::list_all(library_root, client))
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_authors(
    state: tauri::State<CitadelState>,
) -> Result<Vec<LibraryAuthor>, String> {
    state.with_client(|client| {
        client
            .list_all_authors()
            .map(|author_list| author_list.iter().map(LibraryAuthor::from).collect())
    })
    .and_then(|result| result.map_err(|e| format!("Failed to list authors: {}", e)))
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_is_file_importable(path_to_file: String) -> Option<ImportableFile> {
    let file_path = Path::new(&path_to_file);

    file_formats::validate_file_importable(file_path)
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_importable_file_metadata(file: ImportableFile) -> Option<ImportableBookMetadata> {
    file_formats::get_importable_file_metadata(file)
}
#[tauri::command]
#[specta::specta]
/// Lists all importable file types. Those are files that Citadel knows how
/// to import, and that libcalibre supports.
pub fn clb_query_list_all_filetypes() -> Vec<(String, String)> {
    file_formats::SupportedFormats::list_all()
        .iter()
        .filter_map(|(_, extension)| {
            MIMETYPE::from_file_extension(extension)
                .filter(|mimetype| mimetype != &MIMETYPE::UNKNOWN)
                .map(|mimetype| (mimetype.as_str().to_string(), extension.to_string()))
        })
        .collect()
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_is_path_valid_library(library_root: String) -> bool {
    let db_path = libcalibre::util::get_db_path(&library_root);
    db_path.is_some()
}
