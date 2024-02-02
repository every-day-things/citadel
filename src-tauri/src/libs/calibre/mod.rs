use std::io::Error;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;

use crate::book::ImportableBookMetadata;
use crate::book::LibraryAuthor;
use crate::book::LibraryBook;

use chrono::NaiveDate;
use chrono::NaiveDateTime;
use diesel::RunQueryDsl;
use libcalibre::application::services::domain::author::dto::NewAuthorDto;
use libcalibre::application::services::domain::author::service::AuthorService;
use libcalibre::application::services::domain::author::service::AuthorServiceTrait;
use libcalibre::application::services::domain::book::dto::NewBookDto;
use libcalibre::application::services::domain::book::dto::UpdateBookDto;
use libcalibre::application::services::domain::book::service::BookService;
use libcalibre::application::services::domain::book::service::BookServiceTrait;
use libcalibre::application::services::domain::file::service::BookFileService;
use libcalibre::application::services::domain::file::service::BookFileServiceTrait;
use libcalibre::application::services::library::dto::NewLibraryEntryDto;
use libcalibre::application::services::library::dto::NewLibraryFileDto;
use libcalibre::application::services::library::dto::UpdateLibraryEntryDto;
use libcalibre::application::services::library::service::LibraryService;
use libcalibre::infrastructure::domain::author::repository::AuthorRepository;
use libcalibre::infrastructure::domain::book::repository::BookRepository;
use libcalibre::infrastructure::domain::book_file::repository::BookFileRepository;
use libcalibre::infrastructure::file_service::FileServiceTrait;
use libcalibre::mime_type::MIMETYPE;
use serde::Deserialize;
use serde::Serialize;

mod author;
mod book;
pub mod send_to_device;

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
pub fn calibre_load_books_from_db(library_root: String) -> Vec<LibraryBook> {
    book::list_all(library_root)
}

#[tauri::command]
#[specta::specta]
pub fn calibre_list_all_authors(library_root: String) -> Vec<LibraryAuthor> {
    author::list_all(library_root)
}

#[tauri::command]
#[specta::specta]
pub fn check_file_importable(path_to_file: String) -> Option<ImportableFile> {
    let file_path = Path::new(&path_to_file);

    super::file_formats::validate_file_importable(file_path)
}

#[tauri::command]
#[specta::specta]
pub fn get_importable_file_metadata(file: ImportableFile) -> Option<ImportableBookMetadata> {
    super::file_formats::get_importable_file_metadata(file)
}

#[tauri::command]
#[specta::specta]
/// Lists all importable file types. Those are files that Citadel knows how
/// to import, and that libcalibre supports.
pub fn calibre_list_all_filetypes() -> Vec<(&'static str, &'static str)> {
    super::file_formats::SupportedFormats::list_all()
        .iter()
        .map(|(_, extension)| (MIMETYPE::from_file_extension(extension), *extension))
        .filter(|(mimetype, _)| mimetype.is_some() && mimetype.as_ref().unwrap() != &MIMETYPE::UNKNOWN)
        .map(|(mimetype, ext)| (mimetype.unwrap().as_str(), ext))
        .collect()
}

pub fn create_folder_for_author(
    library_path: &String,
    author_name: String,
) -> Result<PathBuf, Error> {
    let author_path = Path::new(&library_path).join(&author_name);
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
pub fn add_book_to_db_by_metadata(library_path: String, md: ImportableBookMetadata) {
    let database_path = libcalibre::util::get_db_path(&library_path);
    match database_path {
        None => panic!("Could not find database at {}", library_path),
        Some(database_path) => {
            let book_repo = Box::new(BookRepository::new(&database_path));
            let author_repo = Box::new(AuthorRepository::new(&database_path));
            let book_file_repo = Box::new(BookFileRepository::new(&database_path));

            let book_service = Arc::new(Mutex::new(BookService::new(book_repo)));
            let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));
            let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
            let file_service = Arc::new(Mutex::new(
                libcalibre::infrastructure::file_service::FileService::new(&library_path),
            ));

            let mut library_service = LibraryService::new(
                book_service,
                author_service,
                file_service,
                book_file_service,
            );

            let authors = match md.author_names {
                Some(authors) => authors
                    .iter()
                    .map(|name| NewAuthorDto {
                        full_name: name.clone(),
                        sortable_name: "".to_string(),
                        external_url: None,
                    })
                    .collect(),
                None => vec![],
            };

            let _ = library_service.create(NewLibraryEntryDto {
                book: NewBookDto {
                    title: md.title.clone(),
                    timestamp: None,
                    pubdate: Some(NaiveDateTime::new(
                        md.publication_date
                            .unwrap_or(NaiveDate::from_ymd(1970, 1, 1)),
                        chrono::NaiveTime::from_hms(0, 0, 0),
                    )),
                    series_index: 1.0,
                    isbn: None,
                    lccn: None,
                    flags: 0,
                    has_cover: None,
                },
                authors,
                files: Some(vec![NewLibraryFileDto { path: md.path }]),
            });
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct BookUpdate {
    pub author_id_list: Option<Vec<String>>,
    pub title: Option<String>,
    pub timestamp: Option<NaiveDateTime>,
    pub publication_date: Option<NaiveDateTime>,
    // pub tags: Option<String>,
    // pub ext_id_list: Option<Vec<String>>,
}

#[tauri::command]
#[specta::specta]
pub fn update_book(library_path: String, book_id: String, updates: BookUpdate) -> Result<i32, ()> {
    let database_path = libcalibre::util::get_db_path(&library_path);
    match database_path {
        None => panic!("Could not find database at {}", library_path),
        Some(database_path) => {
            let book_repo = Box::new(BookRepository::new(&database_path));
            let author_repo = Box::new(AuthorRepository::new(&database_path));
            let book_file_repo = Box::new(BookFileRepository::new(&database_path));

            let book_service = Arc::new(Mutex::new(BookService::new(book_repo)));
            let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));
            let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
            let file_service = Arc::new(Mutex::new(
                libcalibre::infrastructure::file_service::FileService::new(&library_path),
            ));

            let mut library_service = LibraryService::new(
                book_service,
                author_service,
                file_service,
                book_file_service,
            );

            let book_id_int = book_id.parse::<i32>().unwrap();
            let result = library_service.update(
                book_id_int,
                UpdateLibraryEntryDto {
                    book: UpdateBookDto {
                        title: updates.title,
                        timestamp: updates.timestamp,
                        pubdate: updates.publication_date,
                        ..UpdateBookDto::default()
                    },
                    author_id_list: updates.author_id_list,
                },
            );
            result.map(|entry| entry.book.id).map_err(|_| ())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn create_library(handle: tauri::AppHandle, library_root: String) -> Result<(), String> {
    let resource_path = handle
        .path_resolver()
        .resolve_resource("resources/empty_7_2_calibre_lib.zip")
        .expect("Failed to find default empty library");

    let file = std::fs::File::open(resource_path).expect("Failed to open default empty library");

    // Extract the default library to the specified location
    let mut archive = zip::ZipArchive::new(file).expect("Failed to read zip archive");
    let result = archive.extract(&library_root).map_err(|e| e.to_string());

    // Set a new UUID for the library
    match libcalibre::util::get_db_path(&library_root) {
        None => return Err("Failed to open database".to_string()),
        Some(db_path) => {
            let mut conn = libcalibre::persistence::establish_connection(&db_path)
                .expect("Failed to open database");
            diesel::sql_query("UPDATE library_id SET uuid = uuid4()")
                .execute(&mut conn)
                .expect("Failed to set new UUID");
        }
    }

    result
}

#[tauri::command]
#[specta::specta]
pub fn is_valid_library(library_root: String) -> bool {
    let db_path = libcalibre::util::get_db_path(&library_root);
    db_path.is_some()
}
