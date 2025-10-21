use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;
use diesel::SelectableHelper;

use crate::dtos::author::NewAuthorDto;
use crate::dtos::author::UpdateAuthorDto;
use crate::entities::author::NewAuthor;
use crate::entities::author::UpdateAuthorData;
use crate::Author;

pub struct AuthorsHandler {
    client: Arc<Mutex<SqliteConnection>>,
}

impl AuthorsHandler {
    pub(crate) fn new(client: Arc<Mutex<SqliteConnection>>) -> Self {
        Self { client }
    }

    pub fn list(&self) -> Result<Vec<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .select(Author::as_select())
            .load::<Author>(&mut *connection)
            .or(Err(()))
    }

    pub fn create(&mut self, dto: NewAuthorDto) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;
        let new_author = NewAuthor::try_from(dto)?;
        let mut connection = self.client.lock().unwrap();

        diesel::insert_into(authors)
            .values(new_author)
            .returning(Author::as_returning())
            .get_result::<Author>(&mut *connection)
            .map_err(|_| ())
    }

    pub fn create_if_missing(&mut self, dto: NewAuthorDto) -> Result<Author, ()> {
        match self.find_by_name(&dto.full_name)? {
            Some(author) => Ok(author),
            _ => self.create(dto),
        }
    }

    pub fn find_by_id(&mut self, search_id: i32) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .filter(id.eq(search_id))
            .select(Author::as_select())
            .get_result::<Author>(&mut *connection)
            .optional()
            .map_err(|_| ())
    }

    pub fn find_by_name(&mut self, search_name: &str) -> Result<Option<Author>, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();

        authors
            .filter(name.eq(search_name))
            .select(Author::as_select())
            .get_result::<Author>(&mut *connection)
            .optional()
            .map_err(|_| ())
    }

    pub fn update(&mut self, author_id: i32, dto: UpdateAuthorDto) -> Result<Author, ()> {
        use crate::schema::authors::dsl::*;
        let mut connection = self.client.lock().unwrap();
        let author = UpdateAuthorData::try_from(dto)?;

        diesel::update(authors)
            .filter(id.eq(author_id))
            .set(author)
            .returning(Author::as_returning())
            .get_result(&mut *connection)
            .or(Err(()))
    }

    pub fn name_author_dir(&mut self, author: &Author) -> String {
        author.name.clone()
    }

    pub fn delete(&mut self, author_id: i32) -> Result<(), ()> {
        use crate::schema::authors::dsl::*;
        use crate::schema::books_authors_link::dsl::{author as link_author, books_authors_link};

        let mut connection = self.client.lock().unwrap();

        // First, check if the author has any linked books
        let book_count: i64 = books_authors_link
            .filter(link_author.eq(author_id))
            .count()
            .get_result(&mut *connection)
            .map_err(|_| ())?;

        // Only delete if the author has no books
        if book_count == 0 {
            diesel::delete(authors.filter(id.eq(author_id)))
                .execute(&mut *connection)
                .map_err(|_| ())?;
            Ok(())
        } else {
            Err(()) // Cannot delete an author that has books
        }
    }

    // === === ===
    // Batch Query Methods for Optimization
    // === === ===

    /// Batch fetch multiple authors by their IDs
    pub fn find_by_ids(
        &self,
        author_ids: &[i32],
    ) -> Result<std::collections::HashMap<i32, Author>, ()> {
        use crate::schema::authors::dsl::*;

        if author_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();

        let results: Vec<Author> = authors
            .filter(id.eq_any(author_ids))
            .select(Author::as_select())
            .load(&mut *connection)
            .map_err(|_| ())?;

        Ok(results.into_iter().fold(
            std::collections::HashMap::with_capacity(results.len()),
            |mut m, a| {
                m.insert(a.id, a);
                m
            },
        ))
    }
}
