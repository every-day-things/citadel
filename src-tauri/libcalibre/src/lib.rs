mod api;
pub mod calibre_client;
mod cover_image;
pub mod db;
pub mod dtos;
mod entities;
pub mod error;
pub mod mime_type;
pub mod models;
pub mod persistence;
mod schema;
pub mod util;

use diesel::SqliteConnection;
use std::sync::{Arc, Mutex};

pub use entities::{
    author::Author, book::Book, book_file::BookFile, book_row::BookRow, book_row::NewBook,
    book_row::UpdateBookData, book_row::UpsertBookIdentifier,
};

pub use error::CalibreError;

pub struct ClientV2 {
    connection: Arc<Mutex<SqliteConnection>>,
}
