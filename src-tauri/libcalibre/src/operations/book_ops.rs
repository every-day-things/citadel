use diesel::prelude::*;
use std::path::Path;

use crate::models::{Book, NewBook};
use crate::persistence::establish_connection;

pub fn create_book(library_folder_path: &Path, book: NewBook) -> Result<Book, ()>{
    use crate::schema::books::dsl::*;
    let conn = &mut establish_connection(library_folder_path);
    let user_to_create = NewBook {
        title: book.title,
        timestamp: book.timestamp,
        pubdate: book.pubdate,
        series_index: book.series_index,
        author_sort: book.author_sort,
        isbn: book.isbn,
        lccn: book.lccn,
        path: book.path,
        flags: book.flags,
        has_cover: book.has_cover,
    };

    match conn {
        Err(_) => Err(()),
        Ok(connection) => {
            Ok(diesel::insert_into(books)
                .values(user_to_create)
                .returning(Book::as_returning())
                .get_result(connection)
                .expect("Error saving new book"))
        }
    }
}

pub fn update_book(library_folder_path: &Path, updates: &Book) -> Result<Book, ()> {
    let conn = &mut establish_connection(library_folder_path);

    match conn {
        Err(_) => Err(()),
        Ok(connection) => {
            let updated = diesel::update(updates)
                .set(updates)
                .returning(Book::as_returning())
                .get_result(connection)
                .expect("Error updating book");

            Ok(updated)
        }
    }
}
