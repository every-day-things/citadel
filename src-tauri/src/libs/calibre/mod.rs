use std::path::PathBuf;

use crate::book::ImportableBookMetadata;
use crate::libs::file_formats::read_epub_metadata;
use crate::templates::format_calibre_metadata_opf;

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

use super::file_formats::cover_data;

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
        title: res.title.unwrap_or("".to_string()),
        author: res.creator,
        language: res.language,
        publisher: res.publisher,
        identifier: res.identifier,
        path: file.path,
    }
}

#[tauri::command]
#[specta::specta]
pub fn add_book_to_db_by_metadata(library_path: String, md: ImportableBookMetadata) {
    // 5. Create Author folder
    let author_str = md.author.unwrap();
    let author_path = Path::new(&library_path).join(&author_str);
    let author_folder = Path::new(&author_path);
    if !author_folder.exists() {
        std::fs::create_dir_all(author_folder).expect("Could not create author folder");
    }

    // 6. Copy file to library folder
    let file_name = "{title} - {author}.{extension}"
        .replace("{title}", &md.title)
        .replace("{author}", &author_str.clone())
        .replace(
            "{extension}",
            &md.path.extension().unwrap().to_str().unwrap(),
        );
    let new_file_path = author_path.join(file_name);
    std::fs::copy(md.path.clone(), new_file_path).expect("Could not copy file to library folder");

    // 6a. Copy cover to library folder
    let cover_data = cover_data(&md.path.clone()).unwrap(); // Unwrap the Option<Vec<u8>> value
    let cover_path = author_path.join("cover.jpg");
    std::fs::write(cover_path, &cover_data).expect("Could not write cover data to file");

    // 6b. Copy metadata.opf to library folder
    let metadata_opf = format_calibre_metadata_opf(
        "282",
        "151b2732-3b05-4306-b0ed-ab5a081f1930",
        &md.title.as_str(),
        &author_str,
        &author_str,
        "2021-01-01",
        "eng",
        &["tag1", "tag2", "tag3"],
        "2021-01-01T00:00:00+00:00",
        &md.title.as_str(),
    );
    let metadata_opf_path = author_path.join("metadata.opf");
    std::fs::write(metadata_opf_path, &metadata_opf).expect("Could not write metadata.opf");

    // 7. Add metadata to database
}
