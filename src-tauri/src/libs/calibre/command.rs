use tauri::Manager;

use crate::book::ImportableBookMetadata;
use crate::book::LibraryAuthor;
use crate::calibre::author::NewAuthor;
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
    state.with_library(|lib| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        lib.update_book(
            libcalibre::BookId::from(book_id_int),
            updates.to_library_update(),
        )
        .map(|entry| entry.id.as_i32())
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
        .map_err(|e| format!("Failed to find default empty library: {}", e))?;

    let file = std::fs::File::open(resource_path)
        .map_err(|e| format!("Failed to open default empty library: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;
    let result = archive.extract(&library_root).map_err(|e| e.to_string());

    // Set a new UUID for the library
    if let Some(db_path) = libcalibre::util::get_db_path(&library_root) {
        if let Ok(mut lib) = libcalibre::Library::new(db_path) {
            let _ = lib.randomize_library_uuid();
        }
    }

    result
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_book(
    state: tauri::State<CitadelState>,
    md: ImportableBookMetadata,
) -> Result<String, String> {
    state.with_library(|lib| {
        let book_add = md.to_book_add();
        lib.add_book(book_add)
            .map(|book| book.id.as_i32().to_string())
            .map_err(|e| e.to_string())
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
    state.with_library(|lib| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        lib.upsert_book_identifier(
            libcalibre::BookId::from(book_id_int),
            label,
            value,
            existing_id,
        )
        .map(|_| ())
        .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_book_identifier(
    state: tauri::State<CitadelState>,
    book_id: String,
    identifier_id: i32,
) -> Result<(), String> {
    state.with_library(|lib| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        lib.delete_book_identifier(libcalibre::BookId::from(book_id_int), identifier_id)
            .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub async fn clb_cmd_set_book_cover_from_url(
    state: tauri::State<'_, CitadelState>,
    book_id: String,
    image_url: String,
) -> Result<(), String> {
    let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
    let image_url = image_url.trim();
    if image_url.is_empty() {
        return Err("Image URL is empty".to_string());
    }

    let response = reqwest::Client::new()
        .get(image_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download cover image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Cover image request returned status {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read cover image bytes: {}", e))?;

    state.with_library(|lib| {
        lib.set_book_cover(libcalibre::BookId::from(book_id_int), bytes.to_vec())
            .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_update_author(
    state: tauri::State<CitadelState>,
    author_id: String,
    updates: AuthorUpdate,
) -> Result<i32, String> {
    state.with_library(|lib| {
        let author_id_int = author_id.parse::<i32>().map_err(|e| e.to_string())?;
        lib.update_author(
            libcalibre::AuthorId::from(author_id_int),
            updates.to_library_update(),
        )
        .map(|entry| entry.id.as_i32())
        .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_author(
    state: tauri::State<CitadelState>,
    author_id: String,
) -> Result<(), String> {
    state.with_library(|lib| {
        let author_id_int = author_id.parse::<i32>().map_err(|e| e.to_string())?;
        lib.remove_author(libcalibre::AuthorId::from(author_id_int))
            .map(|_| ())
            .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_authors(
    state: tauri::State<CitadelState>,
    new_authors: Vec<NewAuthor>,
) -> Result<Vec<LibraryAuthor>, String> {
    state.with_library(|lib| {
        let mut created = Vec::new();
        for author in &new_authors {
            let author_add = libcalibre::AuthorAdd {
                name: author.name.clone(),
                sort: author.sortable_name.clone(),
                link: None,
            };
            let author_id = lib.add_author(author_add).map_err(|e| e.to_string())?;
            let library_author = lib.get_author(author_id).map_err(|e| e.to_string())?;
            created.push(LibraryAuthor::from(&library_author));
        }
        Ok(created)
    })?
}
