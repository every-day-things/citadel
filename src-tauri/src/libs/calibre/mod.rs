use std::path::PathBuf;

use crate::book::ImportableBookMetadata;
use crate::libs::file_formats::read_epub_metadata;
use crate::templates::format_calibre_metadata_opf;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel::query_dsl::RunQueryDsl;
use diesel::sql_types::Text;
use diesel::BelongingToDsl;
use diesel::Connection;
use serde::Deserialize;
use serde::Serialize;

pub mod models;
pub mod schema;

use self::models::Author;
use self::models::{Book, BookAuthorLink};
use schema::authors;
use schema::books;
use schema::books_authors_link;
use schema::data;
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
    let results = books::dsl::books
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

    // Create Book folder, using ID of book
    let book_id = 286;
    let author_id = 215;

    let book_folder_name = "{title} ({id})"
        .replace("{title}", &md.title)
        .replace("{id}", &book_id.to_string());
    let book_folder_path = Path::new(&author_path).join(&book_folder_name);
    if !book_folder_path.exists() {
        std::fs::create_dir_all(book_folder_path).expect("Could not create book folder");
    }

    // Relative path to the Book's folder, from the Library root
    let book_dir_rel_path = Path::new(&author_str).join(&book_folder_name);
    let book_dir_abs_path = Path::new(&library_path).join(&book_dir_rel_path);

    // 6. Copy file to library folder
    let book_author_name = "{title} - {author}"
        .replace("{title}", &md.title)
        .replace("{author}", &author_str.clone());
    let file_name = "{name}.{extension}"
        .replace("{name}", &book_author_name)
        .replace(
            "{extension}",
            &md.path.extension().unwrap().to_str().unwrap(),
        );
    let new_file_path = book_dir_abs_path.join(file_name);
    std::fs::copy(md.path.clone(), new_file_path.clone())
        .expect("Could not copy file to library folder");

    // 6a. Copy cover to library folder
    let cover_data = cover_data(&md.path.clone()).unwrap(); // Unwrap the Option<Vec<u8>> value
    let cover_path = book_dir_abs_path.join("cover.jpg");
    std::fs::write(cover_path, &cover_data).expect("Could not write cover data to file");

    // 6b. Copy metadata.opf to library folder
    let metadata_opf = format_calibre_metadata_opf(
        format!("{}", book_id).as_str(),
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
    let metadata_opf_path = book_dir_abs_path.join("metadata.opf");
    std::fs::write(metadata_opf_path, &metadata_opf).expect("Could not write metadata.opf");

    // 7. Add metadata to database
    sql_function!(fn title_sort(title: Text) -> Text);
    sql_function!(fn uuid4() -> Text);
    let conn = &mut establish_connection(library_path);

    // Run SQL to create new "title_sort" function only for the lifetime of the connection
    // We do this because we have to.
    // See: https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L55-L70
    let _ = title_sort::register_impl(conn, |title: String| title);
    let _ = uuid4::register_impl(conn, || "005ef67f-b152-4fc1-87c9-38dfd4928315".to_string());

    let new_book = Book {
        id: book_id,
        title: md.title,
        sort: None,
        timestamp: None,
        pubdate: None,
        series_index: 1.0,
        author_sort: None,
        isbn: None,
        lccn: None,
        path: book_dir_rel_path.to_str().unwrap().to_string(),
        flags: 1,
        uuid: None,
        has_cover: None,
        last_modified: NaiveDateTime::from_timestamp_millis(1703232998396).unwrap(),
    };
    diesel::insert_into(books::dsl::books)
        .values(new_book)
        .execute(conn)
        .expect("Error saving new book");
    let new_author = Author {
        id: author_id,
        name: author_str,
        sort: None,
        link: "".to_string(),
    };
    diesel::insert_into(authors::dsl::authors)
        .values(&new_author)
        .execute(conn)
        .expect("Error saving new author");
    let new_book_author_link = BookAuthorLink {
        id: 333,
        author: author_id,
        book: book_id,
    };
    diesel::insert_into(books_authors_link::dsl::books_authors_link)
        .values(&new_book_author_link)
        .execute(conn)
        .expect("Error saving new book author link");

    // Add to `data` table so Calibre knows which files exist
    let file_size = std::fs::metadata(md.path.clone())
        .expect("Could not get file metadata")
        .len();
    diesel::insert_into(data::dsl::data)
        .values((
            data::id.eq(265),
            data::book.eq(book_id),
            data::format.eq("EPUB"),
            data::uncompressed_size.eq(diesel::dsl::sql::<diesel::sql_types::Integer>(
                format!("{}", file_size).as_str(),
            )),
            data::name.eq(book_author_name),
        ))
        .execute(conn)
        .expect("Error saving new data");
}
