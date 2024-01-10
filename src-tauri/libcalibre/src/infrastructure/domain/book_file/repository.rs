use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;

use crate::domain::book_file::{
    entity::{BookFile, NewBookFile, UpdateBookFile},
    repository::Repository,
};
use crate::persistence::establish_connection;

pub struct BookFileRepository {
    pub connection: SqliteConnection,
}

impl BookFileRepository {
    pub fn new(connection_url: &str) -> Self {
        Self {
            connection: establish_connection(connection_url).unwrap(),
        }
    }
}

impl Repository for BookFileRepository {
    fn create(&mut self, new_file: &NewBookFile) -> Result<BookFile, ()> {
        use crate::schema::data::dsl::*;

        let created = diesel::insert_into(data)
            .values(new_file)
            .returning(BookFile::as_returning())
            .get_result(&mut self.connection);

        match created {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn find_by_id(&mut self, search_id: i32) -> Result<BookFile, ()> {
        use crate::schema::data::dsl::*;

        let file = data
            .filter(id.eq(search_id))
            .select(BookFile::as_select())
            .get_result::<BookFile>(&mut self.connection)
            .optional();

        match file {
            Ok(Some(b)) => Ok(b),
            Ok(None) => Err(()),
            Err(_) => Err(()),
        }
    }

    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<BookFile>, ()> {
        use crate::schema::data::dsl::*;

        let files = data
            .filter(book.eq(book_id))
            .select(BookFile::as_select())
            .get_results::<BookFile>(&mut self.connection);

        match files {
            Ok(b) => Ok(b),
            Err(_) => Err(()),
        }
    }

    fn update(
        &mut self,
        file_id: i32,
        file: &UpdateBookFile
    ) -> Result<BookFile, ()> {
        use crate::schema::data::dsl::*;

        

        diesel::update(data)
            .filter(id.eq(file_id))
            .set(file)
            .returning(BookFile::as_returning())
            .get_result(&mut self.connection)
            .or(Err(()))
    }
}
