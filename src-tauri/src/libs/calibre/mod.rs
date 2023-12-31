use std::io::Error;
use std::path::PathBuf;
use std::str::FromStr;

use crate::book::ImportableBookMetadata;
use crate::book::ImportableBookType;
use crate::libs::file_formats::cover_data;
use crate::libs::file_formats::read_epub_metadata;
use crate::templates::format_calibre_metadata_opf;

use chrono::NaiveDate;
use chrono::Utc;
use diesel::prelude::*;
use diesel::query_dsl::RunQueryDsl;
use diesel::sql_types::Text;
use diesel::Connection;
use serde::Deserialize;
use serde::Serialize;

pub mod add_book;
pub mod models;
pub mod names;
pub mod schema;

use self::add_book::insert_book_metadata;
use self::models::Author;
use self::models::Book;
use regex::Regex;
use schema::authors;
use schema::books;
use schema::books_authors_link;
use schema::data;
use std::path::Path;

#[derive(Serialize, specta::Type, Debug, Clone)]
pub struct CalibreBook {
    id: i32,
    title: String,
    sortable_title: String,
    sortable_author_list: String,
    dir_rel_path: String,
    filename: String,
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

fn book_to_calibre_book(
    book: &Book,
    author_names: Vec<String>,
    book_file_name: String,
) -> CalibreBook {
    CalibreBook {
        id: book.id.unwrap(),
        title: book.title.clone(),
        sortable_title: book.sort.clone().unwrap_or(book.title.clone()),
        sortable_author_list: book.author_sort.clone().unwrap_or("".to_string()),
        dir_rel_path: book.path.clone(),
        filename: book_file_name.clone(),
        has_cover: book.has_cover.unwrap_or(false),
        order_in_series: "".to_string(),
        authors: author_names,
    }
}
pub fn establish_connection(library_path: String) -> diesel::SqliteConnection {
    let database_url = library_path + "/metadata.db";

    // Register foreign function definitions which Sqlite can call on insert or update.
    sql_function!(fn title_sort(title: Text) -> Text);
    sql_function!(fn uuid4() -> Text);

    let mut conn = diesel::SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url));
    let mutable_conn = &mut conn;

    // Register our implementations of required foreign functions. We MUST do this,
    // because Calibre does so. These are not available in the Sqlite DB when we
    // connect.
    // See: https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L55-L70
    let _ = title_sort::register_impl(mutable_conn, |title: String| {
        // Based on Calibre's implementation
        // https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L61C1-L69C54
        let title_pat = Regex::new(r"^(A|The|An)\s+").unwrap();

        if let Some(matched) = title_pat.find(&title) {
            let prep = matched.as_str();
            let new_title = title.replacen(prep, "", 1) + ", " + prep;
            return new_title.trim().to_string();
        }

        title.to_string()
    });
    let _ = uuid4::register_impl(mutable_conn, || uuid::Uuid::new_v4().to_string());

    conn
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
            if b.id.is_none() {
                panic!("Book has no ID");
            }
            let book_authors = books_authors_link::dsl::books_authors_link
                .filter(books_authors_link::dsl::book.is(b.id.unwrap()))
                .inner_join(authors::dsl::authors)
                .select(Author::as_select())
                .load::<Author>(conn)
                .expect("error loading books and authors");
            let author_names = book_authors
                .iter()
                .map(|a| a.name.clone())
                .collect::<Vec<String>>();
            let book_file_name = data::table
                .select((data::name, data::format))
                .filter(data::dsl::book.eq(b.id.unwrap()))
                .first::<(String, String)>(conn)
                .expect("Error loading book file name");
            book_to_calibre_book(
                b,
                author_names,
                format!("{}.{}", book_file_name.0, book_file_name.1.to_lowercase()),
            )
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
        file_type: ImportableBookType::EPUB,
        title: res.title.unwrap_or("".to_string()),
        author: res.creator,
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

pub fn create_folder_for_author(library_path: &String, author_name: String) -> Result<PathBuf, Error> {
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
    // TODO:
    // 1. ✅ Reorg so that we insert book, author first, get the IDs, _then_ move files.
    // 2. Extract functionality into small functions to make it clear what this does
    // 3. Improve error handling, as needed
    // 4. ✅ Remove hard-coded values obvs. — ids, but also UUIDs and timestamps
    // 5. Make testable
    // 6. ✅ Correctly implement `title_sort` and `uuid4` sqlite functions

    // 5. Create Author folder
    let author_str = md.author.clone().unwrap();
    let author_path = create_folder_for_author(&library_path, author_str.clone()).unwrap();

    // 7. Add metadata to database
    let conn = &mut establish_connection(library_path.clone());

    let now = Utc::now();
    let inserted_book = insert_book_metadata(conn, &md, now).unwrap();

    // Create Book folder, using ID of book
    let book_id = inserted_book.book_id;

    let book_folder_name = names::gen_book_folder_name(md.title.clone(), book_id);
    let book_folder_path = Path::new(&author_path).join(&book_folder_name);
    if !book_folder_path.exists() {
        std::fs::create_dir_all(book_folder_path).expect("Could not create book folder");
    }

    // Relative path to the Book's folder, from the Library root
    let book_dir_rel_path = Path::new(&author_str).join(&book_folder_name);
    let book_dir_abs_path = Path::new(&library_path).join(&book_dir_rel_path);

    // 6. Copy file to library folder
    let book_file_name = names::gen_book_file_name(&md.title, &author_str);
    let filename_with_ext = "{name}.{extension}"
        .replace("{name}", &book_file_name)
        .replace(
            "{extension}",
            &md.path.extension().unwrap().to_str().unwrap(),
        );
    let new_file_path = book_dir_abs_path.join(filename_with_ext);
    std::fs::copy(md.path.clone(), new_file_path.clone())
        .expect("Could not copy file to library folder");

    // 6a. Copy cover to library folder
    let cover_data = cover_data(&md.path.clone()).unwrap(); // Unwrap the Option<Vec<u8>> value
    let cover_path = book_dir_abs_path.join("cover.jpg");
    std::fs::write(cover_path, &cover_data).expect("Could not write cover data to file");

    // 6b. Copy metadata.opf to library folder
    let metadata_opf = format_calibre_metadata_opf(
        format!("{}", book_id).as_str(),
        inserted_book.book_uuid.as_str(),
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

    // 7. Update Book with relative path to book folder
    diesel::update(books::dsl::books.filter(books::id.eq(book_id)))
        .set(books::path.eq(book_dir_rel_path.to_str().unwrap()))
        .returning(Book::as_returning())
        .get_result(conn)
        .unwrap();
}

#[tauri::command]
#[specta::specta]
pub fn update_book(library_path: String, book_id: String, new_title: String) -> Vec<CalibreBook> {
    let conn = &mut establish_connection(library_path.clone());
    let book_id_int = book_id.parse::<i32>().unwrap();

    let updated = diesel::update(books::dsl::books.filter(books::id.eq(book_id_int)))
        .set((books::title.eq(new_title),))
        .returning(Book::as_returning())
        .get_result(conn)
        .unwrap();

    load_books_from_db(library_path)
        .iter()
        .filter(|b| b.id == updated.id.unwrap())
        .cloned()
        .collect()
}
