mod api;
mod cover_image;
pub mod application;
pub mod client;
pub mod client_v2;
pub mod domain;
pub mod dtos;
pub mod infrastructure;
pub mod mime_type;
mod models;
pub mod persistence;
mod schema;
pub mod util;

use std::sync::{Arc, Mutex};

use diesel::SqliteConnection;
pub use domain::author::entity::Author;
pub use domain::book::aggregate::BookWithAuthorsAndFiles;
pub use domain::book::entity::Book;
pub use domain::book_file::entity::BookFile;

pub struct ClientV2 {
    connection: Arc<Mutex<SqliteConnection>>,
}
