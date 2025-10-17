use crate::api::{authors, book_files, books};
use crate::persistence::establish_connection;
use crate::util::ValidDbPath;
use crate::ClientV2;
use std::sync::Arc;
use std::sync::Mutex;

impl ClientV2 {
    pub fn new(db_path: ValidDbPath) -> Self {
        let conn = establish_connection(&db_path.database_path).unwrap();
        ClientV2 {
            connection: Arc::new(Mutex::new(conn)),
        }
    }

    pub fn authors(&mut self) -> authors::AuthorsHandler {
        authors::AuthorsHandler::new(Arc::clone(&self.connection))
    }

    pub fn books(&mut self) -> books::BooksHandler {
        books::BooksHandler::new(Arc::clone(&self.connection))
    }

    pub fn book_files(&mut self) -> book_files::BookFilesHandler {
        book_files::BookFilesHandler::new(Arc::clone(&self.connection))
    }
}
