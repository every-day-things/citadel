mod api;
pub mod client;
pub mod client_v2;
mod cover_image;
pub mod dtos;
mod entities;
pub mod mime_type;
mod models;
pub mod persistence;
mod schema;
pub mod util;

use diesel::SqliteConnection;
use std::sync::{Arc, Mutex};

pub use entities::{
    author::Author, book::Book, book::UpsertBookIdentifier,
    book_aggregate::BookWithAuthorsAndFiles, book_file::BookFile,
};

pub struct ClientV2 {
    connection: Arc<Mutex<SqliteConnection>>,
}
