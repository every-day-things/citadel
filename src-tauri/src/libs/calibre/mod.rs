use std::io::Error;
use std::path::PathBuf;

use crate::book::ImportableBookMetadata;
use crate::book::LibraryAuthor;
use crate::book::LibraryBook;

use author::NewAuthor;
use chrono::NaiveDateTime;
use libcalibre::client::CalibreClient;
use libcalibre::dtos::author::UpdateAuthorDto;
use libcalibre::dtos::book::UpdateBookDto;
use libcalibre::dtos::library::UpdateLibraryEntryDto;
use libcalibre::mime_type::MIMETYPE;
use libcalibre::UpsertBookIdentifier;
use serde::Deserialize;
use serde::Serialize;
use tauri::Manager;

mod author;
mod book;

use std::path::Path;

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct ImportableFile {
    pub(crate) path: PathBuf,
}

#[derive(Serialize, specta::Type)]
pub struct CalibreClientConfig {
    library_path: String,
}

#[tauri::command]
#[specta::specta]
pub fn init_client(library_path: String) -> CalibreClientConfig {
    CalibreClientConfig {
        library_path: library_path.clone(),
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_books(library_root: String) -> Vec<LibraryBook> {
    book::list_all(library_root)
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_authors(library_root: String) -> Vec<LibraryAuthor> {
    author::list_all(library_root)
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_is_file_importable(path_to_file: String) -> Option<ImportableFile> {
    let file_path = Path::new(&path_to_file);

    super::file_formats::validate_file_importable(file_path)
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_importable_file_metadata(file: ImportableFile) -> Option<ImportableBookMetadata> {
    super::file_formats::get_importable_file_metadata(file)
}

#[tauri::command]
#[specta::specta]
/// Lists all importable file types. Those are files that Citadel knows how
/// to import, and that libcalibre supports.
pub fn clb_query_list_all_filetypes() -> Vec<(&'static str, &'static str)> {
    super::file_formats::SupportedFormats::list_all()
        .iter()
        .map(|(_, extension)| (MIMETYPE::from_file_extension(extension), *extension))
        .filter(|(mimetype, _)| {
            mimetype.is_some() && mimetype.as_ref().unwrap() != &MIMETYPE::UNKNOWN
        })
        .map(|(mimetype, ext)| (mimetype.unwrap().as_str(), ext))
        .collect()
}

pub fn clb_cmd_create_author_dir(
    library_root: &String,
    author_name: String,
) -> Result<PathBuf, Error> {
    let author_path = Path::new(&library_root).join(author_name);
    let author_folder = Path::new(&author_path);
    if !author_folder.exists() {
        match std::fs::create_dir(author_folder) {
            Ok(_) => Ok(author_path),
            Err(e) => Err(e),
        }
    } else {
        Ok(author_path)
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_book(library_root: String, md: ImportableBookMetadata) {
    let database_path = libcalibre::util::get_db_path(&library_root);
    match database_path {
        None => panic!("Could not find database at {}", library_root),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);
            let dto = md.to_new_library_entry_dto();
            let _result = calibre.add_book(dto);
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_upsert_book_identifier(
    library_root: String,
    book_id: String,
    label: String,
    value: String,
    existing_id: Option<i32>,
) -> Result<(), ()> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(()),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let book_id_int = book_id.parse::<i32>().unwrap();
            let result = calibre.upsert_book_identifier(UpsertBookIdentifier {
                book_id: book_id_int,
                id: existing_id,
                label,
                value,
            });

            result.map(|_| ()).map_err(|_| ())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_book_identifier(
    library_root: String,
    book_id: String,
    identifier_id: i32,
) -> Result<(), ()> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(()),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let book_id_int = book_id.parse::<i32>().unwrap();
            let result = calibre.delete_book_identifier(book_id_int, identifier_id);
            result.map(|_| ()).map_err(|_| ())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_update_author(
    library_root: String,
    author_id: String,
    updates: AuthorUpdate,
) -> Result<i32, ()> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(()),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let author_id_int = author_id.parse::<i32>().unwrap();
            let result = calibre.update_author(author_id_int, updates.to_dto());

            result.map(|entry| entry.id).map_err(|_| ())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_delete_author(library_root: String, author_id: String) -> Result<(), ()> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(()),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let author_id_int = author_id.parse::<i32>().unwrap();
            calibre.delete_author(author_id_int)
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_create_authors(
    library_root: String,
    new_authors: Vec<NewAuthor>,
) -> Vec<LibraryAuthor> {
    author::create_authors(library_root, new_authors)
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct BookUpdate {
    pub author_id_list: Option<Vec<String>>,
    pub title: Option<String>,
    pub timestamp: Option<NaiveDateTime>,
    pub publication_date: Option<NaiveDateTime>,
    pub is_read: Option<bool>,
    pub description: Option<String>,
}

impl BookUpdate {
    pub fn to_dto(&self) -> UpdateLibraryEntryDto {
        UpdateLibraryEntryDto {
            book: UpdateBookDto {
                title: self.title.clone(),
                timestamp: self.timestamp,
                pubdate: self.publication_date,
                is_read: self.is_read,
                description: self.description.clone(),
                ..UpdateBookDto::default()
            },
            author_id_list: self.author_id_list.clone(),
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct AuthorUpdate {
    pub full_name: Option<String>,
    pub sortable_name: Option<String>,
    pub external_url: Option<String>,
}

impl AuthorUpdate {
    pub fn to_dto(&self) -> UpdateAuthorDto {
        UpdateAuthorDto {
            full_name: self.full_name.clone(),
            sortable_name: self.sortable_name.clone(),
            external_url: self.external_url.clone(),
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_update_book(
    library_root: String,
    book_id: String,
    updates: BookUpdate,
) -> Result<i32, ()> {
    match libcalibre::util::get_db_path(&library_root) {
        None => Err(()),
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let book_id_int = book_id.parse::<i32>().unwrap();
            let result = calibre.update_book(book_id_int, updates.to_dto());

            result.map(|entry| entry.book.id).map_err(|_| ())
        }
    }
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
pub fn clb_query_is_path_valid_library(library_root: String) -> bool {
    let db_path = libcalibre::util::get_db_path(&library_root);
    db_path.is_some()
}
