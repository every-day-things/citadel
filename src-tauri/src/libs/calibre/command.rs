use libcalibre::calibre_client::CalibreClient;
use tauri::Manager;

use crate::book::ImportableBookMetadata;
use crate::book::LibraryAuthor;
use crate::calibre::author::NewAuthor;
use libcalibre::UpsertBookIdentifier;
use crate::state::CitadelState;

use super::AuthorUpdate;
use super::BookUpdate;

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_update_book(
    state: tauri::State<CitadelState>,
    book_id: String,
    updates: BookUpdate,
) -> Result<i32, String> {
    state.with_client(|client| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        client
            .update_book(book_id_int, updates.to_dto())
            .map(|entry| entry.book.id)
            .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_library(
    handle: tauri::AppHandle,
    library_root: String,
) -> Result<(), String> {
    let resource_path = handle
        .path()
        .resolve(
            "resources/empty_7_2_calibre_lib.zip",
            tauri::path::BaseDirectory::Resource,
        )
        .expect("Failed to find default empty library");

    let file = std::fs::File::open(resource_path).expect("Failed to open default empty library");

    // Extract the default library to the specified location
    let mut archive = zip::ZipArchive::new(file).expect("Failed to read zip archive");
    let result = archive.extract(&library_root).map_err(|e| e.to_string());

    // Set a new UUID for the library
    if let Some(db_path) = libcalibre::util::get_db_path(&library_root) {
        let mut client = CalibreClient::new(db_path);
        let _ = client.dontusethis_randomize_library_uuid();
    }

    result
}
#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_book(
    state: tauri::State<CitadelState>,
    md: ImportableBookMetadata,
) -> Result<(), String> {
    state.with_client(|client| {
        let dto = md.to_new_library_entry_dto();
        client.add_book(dto).map(|_| ()).map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_upsert_book_identifier(
    state: tauri::State<CitadelState>,
    book_id: String,
    label: String,
    value: String,
    existing_id: Option<i32>,
) -> Result<(), String> {
    state.with_client(|client| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        client
            .upsert_book_identifier(UpsertBookIdentifier {
                book_id: book_id_int,
                id: existing_id,
                label,
                value,
            })
            .map(|_| ())
            .map_err(|_| "Failed to upsert book identifier".to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_book_identifier(
    state: tauri::State<CitadelState>,
    book_id: String,
    identifier_id: i32,
) -> Result<(), String> {
    state.with_client(|client| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        client
            .delete_book_identifier(book_id_int, identifier_id)
            .map(|_| ())
            .map_err(|_| "Failed to delete book identifier".to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_update_author(
    state: tauri::State<CitadelState>,
    author_id: String,
    updates: AuthorUpdate,
) -> Result<i32, String> {
    state.with_client(|client| {
        let author_id_int = author_id.parse::<i32>().map_err(|e| e.to_string())?;
        client
            .update_author(author_id_int, updates.to_dto())
            .map(|entry| entry.id)
            .map_err(|_| "Failed to update author".to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_author(
    state: tauri::State<CitadelState>,
    author_id: String,
) -> Result<(), String> {
    state.with_client(|client| {
        let author_id_int = author_id.parse::<i32>().map_err(|e| e.to_string())?;
        client
            .delete_author(author_id_int)
            .map_err(|_| "Failed to delete author".to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_authors(
    state: tauri::State<CitadelState>,
    new_authors: Vec<NewAuthor>,
) -> Result<Vec<LibraryAuthor>, String> {
    state.with_client(|client| {
        let dtos = new_authors
            .iter()
            .map(libcalibre::dtos::author::NewAuthorDto::from)
            .collect::<Vec<libcalibre::dtos::author::NewAuthorDto>>();

        client
            .create_authors(dtos)
            .map(|author_list| author_list.iter().map(LibraryAuthor::from).collect())
            .map_err(|e| e.to_string())
    })?
}
