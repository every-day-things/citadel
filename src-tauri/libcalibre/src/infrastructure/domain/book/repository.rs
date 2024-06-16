use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;

use crate::persistence::establish_connection;
use crate::{
    domain::book::{
        entity::{Book, NewBook, UpsertBookIdentifier},
        repository::Repository,
    },
    models::Identifier,
};

pub struct BookRepository {
    pub connection: SqliteConnection,
}

impl BookRepository {
    pub fn new(connection_url: &str) -> Self {
        Self {
            connection: establish_connection(connection_url).unwrap(),
        }
    }
}

fn uuid_for_book(conn: &mut SqliteConnection, book_id: i32) -> Option<String> {
    use crate::schema::books::dsl::*;

    books
        .select(uuid)
        .filter(id.eq(book_id))
        .first::<Option<String>>(conn)
        .expect("Error getting book UUID")
}

impl Repository for BookRepository {
    fn create(&mut self, book: &crate::domain::book::entity::NewBook) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        let new_book = NewBook {
            title: book.title.clone(),
            timestamp: book.timestamp,
            pubdate: book.pubdate,
            series_index: book.series_index,
            flags: book.flags,
            has_cover: book.has_cover,
        };

        let b = diesel::insert_into(books)
            .values(new_book)
            .returning(Book::as_returning())
            .get_result(&mut self.connection)
            .expect("Error saving new book");

        // SQLite doesn't add the UUID until after our `insert_into` call,
        // so we need to fetch it from the DB to provide it to the caller.
        let mut book_generated = b.clone();
        let book_uuid = uuid_for_book(&mut self.connection, b.id);
        book_generated.uuid = book_uuid;

        Ok(book_generated)
    }

    fn find_by_id(&mut self, search_id: i32) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        let book = books
            .filter(id.eq(search_id))
            .select(Book::as_select())
            .get_result::<Book>(&mut self.connection)
            .optional();

        match book {
            Ok(Some(b)) => Ok(b),
            Ok(None) => Err(()),
            Err(_) => Err(()),
        }
    }

    fn create_book_author_link(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        use crate::schema::books_authors_link::dsl::*;

        let link = diesel::insert_into(books_authors_link)
            .values((book.eq(book_id), author.eq(author_id)))
            .execute(&mut self.connection);

        match link {
            Ok(_) => Ok(()),
            Err(_) => Err(()),
        }
    }

    fn remove_book_author_link(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        use crate::schema::books_authors_link::dsl::*;

        let link =
            diesel::delete(books_authors_link.filter(book.eq(book_id).and(author.eq(author_id))))
                .execute(&mut self.connection);

        match link {
            Ok(_) => Ok(()),
            Err(_) => Err(()),
        }
    }

    fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()> {
        use crate::schema::books_authors_link::dsl::*;

        let author_ids = books_authors_link
            .filter(book.eq(book_id))
            .select(author)
            .load::<i32>(&mut self.connection);

        match author_ids {
            Ok(ids) => Ok(ids),
            Err(_) => Err(()),
        }
    }

    fn update(
        &mut self,
        book_id: i32,
        book: &crate::domain::book::entity::UpdateBookData,
    ) -> Result<Book, ()> {
        use crate::schema::books::dsl::*;

        diesel::update(books)
            .filter(id.eq(book_id))
            .set(book)
            .returning(Book::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()))
    }

    fn all(&mut self) -> Result<Vec<Book>, ()> {
        use crate::schema::books::dsl::*;

        let book_list = books
            .select(Book::as_select())
            .load::<Book>(&mut self.connection);

        match book_list {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()> {
        use crate::schema::identifiers::dsl::*;

        let ids = identifiers
            .filter(book.eq(book_id))
            .select(Identifier::as_returning())
            .load(&mut self.connection);

        match ids {
            Ok(ids) => Ok(ids),
            Err(_) => Err(()),
        }
    }

    fn upsert_book_identifier(&mut self, update: UpsertBookIdentifier) -> Result<i32, ()> {
        match update.id {
            Some(update_id) => upsert_book_identifier_by_id(self, update, update_id),
            None => create_book_identifier(self, update),
        }
    }
}

fn upsert_book_identifier_by_id(
    repo: &mut BookRepository,
    update: UpsertBookIdentifier,
    identifier_id: i32,
) -> Result<i32, ()> {
    use crate::schema::identifiers::dsl::*;

    diesel::update(identifiers)
        .filter(id.eq(identifier_id))
        .set((type_.eq(update.label), val.eq(update.value)))
        .returning(id)
        .get_result::<i32>(&mut repo.connection)
        .or(Err(()))
}

fn create_book_identifier(
    repo: &mut BookRepository,
    update: UpsertBookIdentifier,
) -> Result<i32, ()> {
    use crate::schema::identifiers::dsl::*;

    diesel::insert_into(identifiers)
        .values((
            book.eq(update.book_id),
            type_.eq(update.label),
            val.eq(update.value),
        ))
        .returning(id)
        .get_result::<i32>(&mut repo.connection)
        .or(Err(()))
}
