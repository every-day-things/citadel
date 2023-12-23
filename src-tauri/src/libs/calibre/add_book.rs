use chrono::{DateTime, NaiveDateTime, NaiveTime, Utc};
use diesel::sql_types::Integer;
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

fn upsert_authors(conn: &mut diesel::SqliteConnection, authors: &Vec<String>) -> Vec<i32> {
    let existing_authors = authors::table
        .select(Author::as_select())
        .filter(authors::name.eq_any(authors))
        .load::<Author>(conn)
        .expect("Error loading existing authors");
    let existing_authors_names = existing_authors
        .iter()
        .map(|a| a.name.clone())
        .collect::<Vec<String>>();

    let missing_authors = authors
        .iter()
        .filter(|author| !existing_authors_names.contains(author))
        .collect::<Vec<&String>>();

    let mut author_ids: Vec<i32> = existing_authors.iter().map(|a| a.id.unwrap()).collect();
    for author in missing_authors {
        let new_author = Author {
            id: None, // Set on Insert
            name: author.clone(),
            sort: None, // TODO: Call new "authors sort" fn here
            link: "".to_string(),
        };
        let result = diesel::insert_into(authors::table)
            .values(&new_author)
            .get_result::<Author>(conn);
        match result {
            Ok(author) => {
                author_ids.push(author.id.unwrap());
            }
            Err(e) => {
                println!("Error inserting author: {}", e);
            }
        }
    }
    author_ids
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

    // Get inserted book UUID
    let book_uuid = books::table
        .select(books::uuid)
        .filter(books::id.eq(book_inserted.id.unwrap()))
        .first::<Option<String>>(conn)
        .expect("Error getting book UUID");

    let new_authors = upsert_authors(conn, &vec![author_str.clone()]);
    let author_id = new_authors[0];

    let new_book_author_link = BookAuthorLink {
        id: None, // Set on Insert
        author: author_id,
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
        book_uuid: book_uuid.unwrap(),
        author_ids: vec![author_id],
    })
}
