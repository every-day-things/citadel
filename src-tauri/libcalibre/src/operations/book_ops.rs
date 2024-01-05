use diesel::prelude::*;

use crate::{persistence::establish_connection, domain::book::entity::{Book, NewBook}};

pub fn create_book(library_folder_path: String, book: NewBook) -> Result<Book, ()>{
    use crate::schema::books::dsl::*;
    let conn = &mut establish_connection(library_folder_path);
    let user_to_create = NewBook {
        title: book.title,
        timestamp: book.timestamp,
        pubdate: book.pubdate,
        series_index: book.series_index,
        isbn: book.isbn,
        lccn: book.lccn,
        flags: book.flags,
        has_cover: book.has_cover,
    };

    match conn {
        Err(_) => Err(()),
        Ok(connection) => {
            let inserted_book = diesel::insert_into(books)
                .values(user_to_create)
                .returning(Book::as_returning())
                .get_result(connection)
                .expect("Error saving new book");

            // SQLite doesn't add the UUID until after our `insert_into` call,
            // so we need to fetch it from the DB to provide it to the caller.
            let mut book_generated = inserted_book.clone();
            let book_uuid = uuid_for_book(connection, inserted_book.id);
            book_generated.uuid = book_uuid;

            println!("Saved new book: {:?}", book_generated);
            Ok(book_generated)
        }
    }
}

pub fn update_book(library_folder_path: String, updates: &Book) -> Result<Book, ()> {
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

fn uuid_for_book(conn: &mut SqliteConnection, book_id: i32) -> Option<String> {
  use crate::schema::books::dsl::*;

  let book_uuid = books
      .select(uuid)
      .filter(id.eq(book_id))
      .first::<Option<String>>(conn)
      .expect("Error getting book UUID");

  book_uuid
}
