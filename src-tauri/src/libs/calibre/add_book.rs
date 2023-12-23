use chrono::{DateTime, NaiveDateTime, NaiveTime, Utc};
use std::io::Error;

use diesel::prelude::*;

use crate::book::ImportableBookMetadata;

use super::models::{Author, Book, BookAuthorLink, Data};
use super::names;
use super::schema::{authors, books, books_authors_link, data};

pub struct InsertedBook {
    pub book_id: i32,
    pub book_uuid: String,
    pub author_ids: Vec<i32>,
}

pub fn insert_book_metadata(
    conn: &mut diesel::SqliteConnection,
    md: &ImportableBookMetadata,
    now: DateTime<Utc>,
) -> Result<InsertedBook, Error> {
    let author_str = md.author.clone().unwrap_or("Unknown".to_string());
    let book_file_name = names::gen_book_file_name(&md.title, &author_str);

    let publication_date = md
        .publication_date
        .clone()
        .map(|date| NaiveDateTime::new(date, NaiveTime::from_hms(0, 0, 0)));

    let new_book = Book {
        id: None, // Set on Insert
        title: md.title.clone(),
        sort: None, // Set on Insert
        timestamp: Some(now.naive_local()),
        pubdate: publication_date,
        series_index: 1.0,
        author_sort: None, // TODO: Create "authors sort" fn & call here
        isbn: None,
        lccn: None,
        path: "".to_owned(), // Book Folder relative path, but requires knowing the books ID.
        flags: 1,
        uuid: None, // Set on Insert
        has_cover: Some(md.file_contains_cover),
        last_modified: now.naive_local(),
    };
    let book_inserted = diesel::insert_into(books::table)
        .values(&new_book)
        .returning(Book::as_returning())
        .get_result(conn)
        .unwrap();

    let new_author = Author {
        id: None, // Set on Insert
        name: author_str.clone(),
        sort: None, // TODO: Call "authors sort" fn here
        link: "".to_string(),
    };
    let author_inserted = diesel::insert_into(authors::dsl::authors)
        .values(&new_author)
        .returning(Author::as_returning())
        .get_result(conn)
        .unwrap();

    let new_book_author_link = BookAuthorLink {
        id: None, // Set on Insert
        author: author_inserted.id.unwrap(),
        book: book_inserted.id.unwrap(),
    };
    diesel::insert_into(books_authors_link::dsl::books_authors_link)
        .values(&new_book_author_link)
        .execute(conn)
        .expect("Error saving new book author link");

    // Add to `data` table so Calibre knows which files exist
    let file_size = std::fs::metadata(md.path.clone())
        .expect("Could not get file metadata")
        .len();
    let new_book_data = Data {
        id: None, // Set on Insert
        book: book_inserted.id.unwrap(),
        format: md.file_type.to_string(),
        uncompressed_size: file_size.try_into().unwrap_or(0),
        name: book_file_name,
    };
    diesel::insert_into(data::dsl::data)
        .values(new_book_data)
        .execute(conn)
        .expect("Error saving new data");

    Ok(InsertedBook {
        book_id: book_inserted.id.unwrap(),
        book_uuid: book_inserted.uuid.unwrap(),
        author_ids: vec![author_inserted.id.unwrap()],
    })
}
