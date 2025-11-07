use std::collections::HashMap;
use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;
use diesel::sql_query;
use diesel::sql_types::Integer;
use diesel::QueryableByName;

use crate::entities::book_row::{NewBook, UpdateBookData, UpsertBookIdentifier};
use crate::models::Identifier;
use crate::BookRow;

#[derive(QueryableByName)]
struct CustomValue {
    #[diesel(sql_type = Integer)]
    value: i32,
}

pub struct BooksHandler {
    client: Arc<Mutex<SqliteConnection>>,
}

impl BooksHandler {
    pub(crate) fn new(client: Arc<Mutex<SqliteConnection>>) -> Self {
        Self { client }
    }

    pub fn create(&self, new_book: NewBook) -> Result<BookRow, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        let b = diesel::insert_into(books)
            .values(new_book)
            .returning(BookRow::as_returning())
            .get_result(&mut *connection)
            .expect("Error saving new book");

        // Note: AFTER INSERT triggers fire after RETURNING executes, so the trigger-generated
        // uuid and sort fields won't be in the returned BookRow. We need to fetch the complete
        // record to get these auto-generated values.
        books
            .filter(id.eq(b.id))
            .select(BookRow::as_select())
            .first::<BookRow>(&mut *connection)
            .or(Err(()))
    }

    pub fn list(&self) -> Result<Vec<BookRow>, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        books
            .select(BookRow::as_select())
            .load::<BookRow>(&mut *connection)
            .or(Err(()))
    }

    pub fn update(&mut self, book_id: i32, book: UpdateBookData) -> Result<BookRow, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::update(books)
            .filter(id.eq(book_id))
            .set(book)
            .execute(&mut *connection)
            .or(Err(()))?;

        // Note: AFTER UPDATE triggers fire after the UPDATE executes, so we need to fetch
        // the record to get trigger-updated values (like the sort field).
        books
            .filter(id.eq(book_id))
            .select(BookRow::as_select())
            .first::<BookRow>(&mut *connection)
            .or(Err(()))
    }

    pub fn find_by_id(&mut self, search_id: i32) -> Result<Option<BookRow>, ()> {
        use crate::schema::books::dsl::*;
        let mut connection = self.client.lock().unwrap();

        books
            .filter(id.eq(search_id))
            .select(BookRow::as_select())
            .get_result::<BookRow>(&mut *connection)
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

    // === === ===
    // Identifiers
    // === === ===

    pub fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()> {
        use crate::schema::identifiers::dsl::*;
        let mut connection = self.client.lock().unwrap();

        identifiers
            .filter(book.eq(book_id))
            .select(Identifier::as_returning())
            .load(&mut *connection)
            .or(Err(()))
    }

    pub fn upsert_book_identifier(&mut self, update: UpsertBookIdentifier) -> Result<i32, ()> {
        match update.id {
            Some(update_id) => self.update_book_identifier(update, update_id),
            None => self.create_book_identifier(update),
        }
    }

    fn update_book_identifier(
        &mut self,
        update: UpsertBookIdentifier,
        identifier_id: i32,
    ) -> Result<i32, ()> {
        use crate::schema::identifiers::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::update(identifiers)
            .filter(id.eq(identifier_id))
            .set((type_.eq(update.label), val.eq(update.value)))
            .returning(id)
            .get_result::<i32>(&mut *connection)
            .or(Err(()))
    }

    fn create_book_identifier(&mut self, update: UpsertBookIdentifier) -> Result<i32, ()> {
        use crate::schema::identifiers::dsl::*;
        let mut connection = self.client.lock().unwrap();
        let lowercased_label = update.label.to_lowercase();

        diesel::insert_into(identifiers)
            .values((
                book.eq(update.book_id),
                type_.eq(lowercased_label),
                val.eq(update.value),
            ))
            .returning(id)
            .get_result::<i32>(&mut *connection)
            .or(Err(()))
    }

    pub fn delete_book_identifier(&mut self, book_id: i32, identifier_id: i32) -> Result<(), ()> {
        use crate::schema::identifiers::dsl::*;
        let mut connection = self.client.lock().unwrap();

        diesel::delete(identifiers.filter(book.eq(book_id).and(id.eq(identifier_id))))
            .execute(&mut *connection)
            .map(|_| ())
            .or(Err(()))
    }

    // === === ===
    // Descriptions
    // === === ===

    pub fn get_description(&mut self, book_id: i32) -> Result<Option<String>, ()> {
        use crate::schema::comments::dsl::*;
        let mut connection = self.client.lock().unwrap();

        comments
            .filter(book.eq(book_id))
            .select(text)
            .first(&mut *connection)
            .optional()
            .or(Err(()))
    }

    pub fn set_description(&mut self, book_id: i32, description: &str) -> Result<(), ()> {
        use crate::schema::comments::dsl::*;
        let mut connection = self.client.lock().unwrap();

        // Check if a comment already exists for this book
        let existing = comments
            .filter(book.eq(book_id))
            .select(id)
            .first::<i32>(&mut *connection)
            .optional()
            .or(Err(()))?;

        match existing {
            Some(comment_id) => {
                // Update existing comment
                diesel::update(comments.filter(id.eq(comment_id)))
                    .set(text.eq(description))
                    .execute(&mut *connection)
                    .map(|_| ())
                    .or(Err(()))
            }
            None => {
                // Insert new comment
                diesel::insert_into(comments)
                    .values((book.eq(book_id), text.eq(description)))
                    .execute(&mut *connection)
                    .map(|_| ())
                    .or(Err(()))
            }
        }
    }

    // === === ===
    // Read state
    // === === ===
    fn get_or_create_read_state_custom_column(
        &self,
        connection: &mut SqliteConnection,
    ) -> Result<i32, ()> {
        use crate::schema::custom_columns::dsl::*;

        let custom_column_id = custom_columns
            .select(id)
            .filter(label.eq("read"))
            .filter(datatype.eq("bool"))
            .first::<i32>(connection)
            .optional()
            .or(Err(()))?;

        if custom_column_id.is_none() {
            let column_id = diesel::insert_into(custom_columns)
                .values((
                    label.eq("read"),
                    name.eq("Read"),
                    datatype.eq("bool"),
                    mark_for_delete.eq(false),
                    editable.eq(true),
                    is_multiple.eq(false),
                    normalized.eq(false),
                    display.eq("{}"),
                ))
                .returning(id)
                .get_result::<i32>(connection)
                .or(Err(()))?;

            sql_query(format!(
                "CREATE TABLE custom_column_{column_id} (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE, value INTEGER NOT NULL);"
            ))
            .execute(connection)
            .or(Err(()))?;

            Ok(column_id)
        } else {
            Ok(custom_column_id.unwrap())
        }
    }

    pub fn get_book_read_state(&self, book_id: i32) -> Result<Option<bool>, ()> {
        let mut connection = self.client.lock().unwrap();

        let read_state_column_id = self.get_or_create_read_state_custom_column(&mut *connection)?;
        let value = sql_query(format!(
            "SELECT value FROM custom_column_{read_state_column_id} WHERE book = ?"
        ))
        .bind::<Integer, _>(book_id)
        .get_result::<CustomValue>(&mut *connection)
        .map(|v| v.value)
        .or(Err(()));

        match value {
            Ok(v) => match v {
                1 => Ok(Some(true)),
                _ => Ok(Some(false)),
            },
            Err(_) => Ok(Some(false)),
        }
    }

    pub fn set_book_read_state(&mut self, book_id: i32, read_state: bool) -> Result<(), ()> {
        let mut connection = self.client.lock().unwrap();

        let read_state_column_id = self.get_or_create_read_state_custom_column(&mut *connection)?;
        let value = if read_state { 1 } else { 0 };

        sql_query(format!(
            "INSERT OR REPLACE INTO custom_column_{read_state_column_id} (book, value) VALUES (?, ?)"
        ))
        .bind::<Integer, _>(book_id)
        .bind::<Integer, _>(value)
        .execute(&mut *connection)
        .map(|_| ())
        .or(Err(()))
    }

    // === === ===
    // Batch Query Methods for Optimization
    // === === ===

    /// Batch fetch descriptions for multiple books
    pub fn batch_get_descriptions(&mut self, book_ids: &[i32]) -> Result<HashMap<i32, String>, ()> {
        use crate::schema::comments::dsl::*;

        if book_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();

        let results: Vec<(i32, String)> = comments
            .filter(book.eq_any(book_ids))
            .select((book, text))
            .load(&mut *connection)
            .or(Err(()))?;

        Ok(results.into_iter().collect())
    }

    /// Batch fetch book-author links for multiple books
    pub fn batch_get_author_links(
        &mut self,
        book_ids: &[i32],
    ) -> Result<HashMap<i32, Vec<i32>>, ()> {
        use crate::schema::books_authors_link::dsl::*;

        if book_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();

        let results: Vec<(i32, i32)> = books_authors_link
            .filter(book.eq_any(book_ids))
            .select((book, author))
            .load(&mut *connection)
            .or(Err(()))?;

        // Group by book_id
        let mut map: HashMap<i32, Vec<i32>> = HashMap::new();
        for (book_id, author_id) in results {
            map.entry(book_id).or_insert_with(Vec::new).push(author_id);
        }

        Ok(map)
    }

    /// Batch fetch read states for multiple books
    pub fn batch_get_read_states(&mut self, book_ids: &[i32]) -> Result<HashMap<i32, bool>, ()> {
        if book_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();
        let read_state_column_id = self.get_or_create_read_state_custom_column(&mut *connection)?;

        #[derive(QueryableByName)]
        struct BookReadState {
            #[diesel(sql_type = Integer)]
            book: i32,
            #[diesel(sql_type = Integer)]
            value: i32,
        }

        // Build a query with all book IDs using IN clause
        let book_ids_str = book_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",");
        let query_str = format!(
            "SELECT book, value FROM custom_column_{} WHERE book IN ({})",
            read_state_column_id, book_ids_str
        );

        let results: Vec<BookReadState> =
            sql_query(query_str).load(&mut *connection).or(Err(()))?;

        let map: HashMap<i32, bool> = results
            .into_iter()
            .map(|r| (r.book, r.value == 1))
            .collect();

        Ok(map)
    }

    /// Batch fetch identifiers for multiple books
    pub fn batch_get_identifiers(
        &mut self,
        book_ids: &[i32],
    ) -> Result<HashMap<i32, Vec<Identifier>>, ()> {
        use crate::schema::identifiers::dsl::*;

        if book_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let mut connection = self.client.lock().unwrap();

        let results: Vec<Identifier> = identifiers
            .filter(book.eq_any(book_ids))
            .select(Identifier::as_returning())
            .load(&mut *connection)
            .or(Err(()))?;

        // Group by book_id
        let mut map: HashMap<i32, Vec<Identifier>> = HashMap::new();
        for identifier in results {
            map.entry(identifier.book)
                .or_insert_with(Vec::new)
                .push(identifier);
        }

        Ok(map)
    }
}
