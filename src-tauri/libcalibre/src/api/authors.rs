use std::sync::Arc;
use std::sync::Mutex;

use diesel::prelude::*;
use diesel::SelectableHelper;

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
}
