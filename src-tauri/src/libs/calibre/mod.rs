use diesel::prelude::*;
use diesel::query_dsl::RunQueryDsl;
use diesel::BelongingToDsl;
use diesel::Connection;
use serde::Serialize;

use crate::book::LibraryBook;
use crate::libs::calibre::models::Book;

pub mod models;
pub mod schema;

use schema::books::dsl::*;

use self::models::Author;
use self::models::BookAuthorLink;
use self::schema::{authors, books_authors_link};

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

#[derive(Debug)]
struct CalibreAuthor {
    id: i32,
    name: String,
    name_sort: String,
}

struct DbInitError {
    message: String,
}

struct CalibreLibrary {
    library_url: String,
    book_list: Vec<CalibreBook>,
    conn: diesel::SqliteConnection,
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

pub fn establish_connection() -> diesel::SqliteConnection {
    let database_url = "/Users/phil/dev/macos-book-app/sample-library/metadata.db";
    diesel::SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

#[tauri::command]
#[specta::specta]
pub fn load_books_from_db() -> Vec<CalibreBook> {
    let conn = &mut establish_connection();
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

impl CalibreLibrary {
    fn new(&self, library_url: &str) -> Self {
        let conn = establish_connection();
        let loaded_books = Self::load_books_from_db(&self);

        Self {
            library_url: library_url.to_string(),
            book_list: loaded_books,
            conn,
        }
    }

    fn load_books_from_db(self: &Self) -> Vec<CalibreBook> {
        let conn = &mut establish_connection();
        let results = books
            .limit(5)
            .select(Book::as_select())
            .load::<Book>(conn)
            .expect("error loading books");
        println!("# of books - {}", results.len());
        Vec::<CalibreBook>::new()
    }

    fn list_books(&self) -> Vec<LibraryBook> {
        self.book_list
            .iter()
            .map(|cb| LibraryBook {
                title: cb.title.clone(),
            })
            .collect()
    }

    fn list_authors(&self) -> Vec<LibraryBook> {
        Vec::new()
    }
}
