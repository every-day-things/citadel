use std::io::Error;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use std::sync::Mutex;

use crate::book::ImportableBookMetadata;
use crate::book::ImportableBookType;
use crate::book::LibraryAuthor;
use crate::book::LibraryBook;
use crate::libs::file_formats::read_epub_metadata;

use chrono::NaiveDate;
use chrono::NaiveDateTime;
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
use serde::Deserialize;
use serde::Serialize;

mod author;
mod book;
pub mod models;
pub mod schema;
pub mod send_to_device;

use std::path::Path;

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct ImportableFile {
    path: PathBuf,
}

fn get_supported_extensions() -> Vec<&'static str> {
    vec!["epub", "mobi", "pdf"]
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
pub fn check_file_importable(path_to_file: String) -> ImportableFile {
    let file_path = Path::new(&path_to_file);

    if !file_path.exists() {
        panic!("File does not exist at {}", path_to_file);
    }

    let file_extension = file_path.extension().and_then(|ext| ext.to_str());

    match file_extension {
        Some(extension) if get_supported_extensions().contains(&extension) => ImportableFile {
            path: PathBuf::from(path_to_file),
        },
        Some(extension) => {
            panic!("Unsupported file extension: {}", extension);
        }
        None => {
            panic!("File does not have an extension");
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn get_importable_file_metadata(file: ImportableFile) -> ImportableBookMetadata {
    // TODO Do not assume file is an EPUB
    let res = read_epub_metadata(file.path.as_path());

    ImportableBookMetadata {
        file_type: ImportableBookType::EPUB,
        title: res.title.unwrap_or("".to_string()),
        author_names: res.creator_list,
        language: res.language,
        publisher: res.publisher,
        identifier: res.identifier,
        path: file.path,
        file_contains_cover: res.cover_image_data.is_some(),
        tags: res.subjects,
        publication_date: NaiveDate::from_str(
            res.publication_date.unwrap_or("".to_string()).as_str(),
        )
        .ok(),
    }
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
