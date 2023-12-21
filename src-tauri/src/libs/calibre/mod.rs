use diesel::prelude::*;
use diesel::query_dsl::RunQueryDsl;
use diesel::BelongingToDsl;
use diesel::Connection;
use serde::Serialize;

use crate::libs::calibre::models::Book;

pub mod models;
pub mod schema;

use schema::books::dsl::*;

use self::models::BookAuthorLink;
use self::schema::authors;

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
