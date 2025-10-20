use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;

use crate::entities::book_file::{BookFile, NewBookFile, UpdateBookFile};

pub struct BookFilesHandler {
    client: Arc<Mutex<SqliteConnection>>,
}

impl BookFilesHandler {
    pub(crate) fn new(client: Arc<Mutex<SqliteConnection>>) -> Self {
        Self { client }
    }

    pub fn create(&self, new_file: NewBookFile) -> Result<BookFile, ()> {
        use crate::schema::data::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::insert_into(data)
            .values(new_file)
            .returning(BookFile::as_returning())
            .get_result(&mut *connection)
            .or(Err(()))
    }

    pub fn update(&mut self, file_id: i32, file: &UpdateBookFile) -> Result<BookFile, ()> {
        use crate::schema::data::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::update(data)
            .filter(id.eq(file_id))
            .set(file)
            .returning(BookFile::as_returning())
            .get_result(&mut *connection)
            .or(Err(()))
    }

    pub fn find_by_id(&mut self, search_id: i32) -> Result<Option<BookFile>, ()> {
        use crate::schema::data::dsl::*;
        let mut connection = self.client.lock().unwrap();

        data.filter(id.eq(search_id))
            .select(BookFile::as_select())
            .get_result::<BookFile>(&mut *connection)
            .optional()
            .or(Err(()))
    }

    pub fn list_all_by_book_id(&mut self, book_id: i32) -> Result<Vec<BookFile>, ()> {
        use crate::schema::data::dsl::*;
        let mut connection = self.client.lock().unwrap();

        data.filter(book.eq(book_id))
            .select(BookFile::as_select())
            .get_results::<BookFile>(&mut *connection)
            .or(Err(()))
    }

    // === === ===
    // Batch Query Methods for Optimization
    // === === ===

    /// Batch fetch book files for multiple books
    pub fn batch_list_by_book_ids(
        &self,
        book_ids: &[i32],
    ) -> Result<std::collections::HashMap<i32, Vec<BookFile>>, ()> {
        use crate::schema::data::dsl::*;

        if book_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();

        let results: Vec<BookFile> = data
            .filter(book.eq_any(book_ids))
            .select(BookFile::as_select())
            .load(&mut *connection)
            .or(Err(()))?;

        // Group by book_id
        let mut map: std::collections::HashMap<i32, Vec<BookFile>> =
            std::collections::HashMap::new();
        for file in results {
            map.entry(file.book).or_insert_with(Vec::new).push(file);
        }

        Ok(map)
    }
}
