use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;

use crate::domain::book::entity::UpdateBookData;
use crate::models::Identifier;
use crate::Book;

pub struct BooksHandler {
    client: Arc<Mutex<SqliteConnection>>,
}

impl BooksHandler {
    pub(crate) fn new(client: Arc<Mutex<SqliteConnection>>) -> Self {
        Self { client }
    }

    pub fn list(&self) -> Result<Vec<Book>, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        books
            .select(Book::as_select())
            .load::<Book>(&mut *connection)
            .or(Err(()))
    }

    pub fn update(&mut self, book_id: i32, book: UpdateBookData) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::update(books)
            .filter(id.eq(book_id))
            .set(book)
            .returning(Book::as_returning())
            .get_result(&mut *connection)
            .or(Err(()))
    }

    pub fn find_by_id(&mut self, search_id: i32) -> Result<Option<Book>, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        books
            .filter(id.eq(search_id))
            .select(Book::as_select())
            .get_result::<Book>(&mut *connection)
            .optional()
            .or(Err(()))
    }

    pub fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()> {
        use crate::schema::books_authors_link::dsl::*;
        let mut connection = self.client.lock().unwrap();

        let author_ids = books_authors_link
            .filter(book.eq(book_id))
            .select(author)
            .load::<i32>(&mut *connection);

        match author_ids {
            Ok(ids) => Ok(ids),
            Err(_) => Err(()),
        }
    }

    pub fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()> {
        use crate::schema::identifiers::dsl::*;
        let mut connection = self.client.lock().unwrap();

        identifiers
            .filter(book.eq(book_id))
            .select(Identifier::as_returning())
            .load(&mut *connection)
            .or(Err(()))
    }

    pub fn link_author_to_book(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        use crate::schema::books_authors_link::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::insert_into(books_authors_link)
            .values((book.eq(book_id), author.eq(author_id)))
            .execute(&mut *connection)
            .map(|_| ())
            .or(Err(()))
    }

    pub fn unlink_author_from_book(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        use crate::schema::books_authors_link::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::delete(books_authors_link.filter(book.eq(book_id).and(author.eq(author_id))))
            .execute(&mut *connection)
            .map(|_| ())
            .or(Err(()))
    }
}
