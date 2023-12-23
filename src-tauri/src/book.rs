use std::path::PathBuf;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[tauri::command]
#[specta::specta]
pub fn hello_world(my_name: String) -> String {
    format!("Hello, {my_name}! You've been greeted from Rust!")
}

#[derive(Serialize, specta::Type)]
pub struct LibraryBook {
    // Define the fields of LibraryBook struct here
    pub title: String,
}

#[derive(Serialize, specta::Type)]
pub struct LibraryAuthor {
    // Define the fields of LibraryAuthor struct here
}

/// Represents metadata for pre-import books, which have a very loose structure.
#[derive(Serialize, Deserialize, specta::Type)]
pub struct ImportableBookMetadata {
    /// The title of the book, if one is available, or the name of the file to import.
    pub title: String,
    pub author: Option<String>,
    pub identifier: Option<String>,
    pub publisher: Option<String>,
    pub language: Option<String>,
    pub tags: Vec<String>,
    /// Path of the file to import.
    pub path: PathBuf,
    pub publication_date: Option<NaiveDate>,
    /// True if a cover image can be extracted from the file at `path`.
    pub file_contains_cover: bool,
}

pub trait Library {
    fn list_books(&self) -> Vec<LibraryBook>;
    fn list_authors(&self) -> Vec<LibraryAuthor>;
}
