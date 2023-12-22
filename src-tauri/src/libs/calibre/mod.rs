use std::path::PathBuf;

use crate::book::ImportableBookMetadata;
use crate::libs::file_formats::read_epub_metadata;

use diesel::prelude::*;
use diesel::query_dsl::RunQueryDsl;
use diesel::BelongingToDsl;
use diesel::Connection;
use serde::Deserialize;
use serde::Serialize;

pub mod models;
pub mod schema;

use self::models::{Book, BookAuthorLink};
use self::schema::authors;
use schema::books::dsl::*;
use std::path::Path;

#[derive(Serialize, specta::Type, Debug)]
pub struct CalibreBook {
    id: i32,
    title: String,
    sortable_title: String,
    sortable_author_list: String,
    path: String,
    has_cover: bool,
    order_in_series: String,
    authors: Vec<String>,
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct ImportableFile {
    path: PathBuf,
}

fn get_supported_extensions() -> Vec<&'static str> {
    vec!["epub", "mobi", "pdf"]
}

fn book_to_calibre_book(book: &Book, author_names: Vec<String>) -> CalibreBook {
    CalibreBook {
        id: book.id,
        title: book.title.clone(),
        sortable_title: book.sort.clone().unwrap_or(book.title.clone()),
        sortable_author_list: book.author_sort.clone().unwrap_or("".to_string()),
        path: book.path.clone(),
        has_cover: book.has_cover.unwrap_or(false),
        order_in_series: "".to_string(),
        authors: author_names,
    }
}

pub fn establish_connection(library_path: String) -> diesel::SqliteConnection {
    let database_url = library_path + "/metadata.db";
    diesel::SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[tauri::command]
#[specta::specta]
pub fn load_books_from_db(library_path: String) -> Vec<CalibreBook> {
    let conn = &mut establish_connection(library_path);
    let results = books
        .select(Book::as_select())
        .load::<Book>(conn)
        .expect("error loading books");

    results
        .iter()
        .map(|b| {
            let authors_of_book = BookAuthorLink::belonging_to(b)
                .select(BookAuthorLink::as_select())
                .load::<BookAuthorLink>(conn)
                .expect("error loading authors");
            let author_names: Vec<String> = authors_of_book
                .iter()
                .map(|a| {
                    // I cannot figure out how to do this in one query with a join.
                    // Ah well, we'll fix it later.
                    let v = authors::table
                        .filter(authors::id.is(a.author))
                        .select(authors::name)
                        .load::<String>(conn)
                        .expect("error loading authors");
                    v[0].clone()
                })
                .collect();
            book_to_calibre_book(b, author_names)
        })
        .collect()
}

#[tauri::command]
#[specta::specta]
pub fn check_file_importable(path_to_file: String) -> ImportableFile {
    let file_path = Path::new(&path_to_file);

    // 1. Does file exist?
    if !file_path.exists() {
        panic!("File does not exist at {}", path_to_file);
    }

    // 2. Check that file extension is supported (one of: epub, mobi, pdf)
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
    // 3. Read metadata from file
    let res = read_epub_metadata(file.path.as_path());

    // 4. Copy file to Import folder in library
    // TODO: How?? I think hash file + put hash in ImportableFile + copy file as hash to import folder

    ImportableBookMetadata {
        title: res.title.unwrap_or("".to_string()),
        author: res.creator,
        language: res.language,
        publisher: res.publisher,
        identifier: res.identifier,
    }
}

pub fn add_book_to_db_by_metadata(md: ImportableBookMetadata) {
    // 5. Check that file exists in Import folder

    // 6. Copy file to library folder

    // 7. Add metadata to database
}
