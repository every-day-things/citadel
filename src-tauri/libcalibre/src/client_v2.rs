use crate::api::authors::{self};
use crate::persistence::establish_connection;
use crate::util::ValidDbPath;
use crate::Client;
use std::sync::Arc;
use std::sync::Mutex;

impl Client {
    fn new(db_path: ValidDbPath) -> Self {
        let conn = establish_connection(&db_path.database_path).unwrap();
        Client {
            validated_library_path: db_path,
            connection: Arc::new(Mutex::new(conn)),
        }
    }

    fn authors(&mut self) -> authors::AuthorsHandler {
        authors::AuthorsHandler::new(Arc::clone(&self.connection))
    }
}
