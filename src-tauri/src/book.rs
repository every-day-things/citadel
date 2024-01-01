use std::path::PathBuf;

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Serialize, specta::Type, Deserialize)]
pub struct BookFile {
    /// The absolute path to the file, including extension.
    pub path: PathBuf,
    /// The MIME type of the file. Common values are `application/pdf` and `application/epub+zip`.
    pub mime_type: String,
}

#[derive(Serialize, specta::Type, Deserialize)]
pub struct LibraryBook {
    pub title: String,
    pub author_list: Vec<String>,
    pub id: String,
    pub uuid: Option<String>,
    pub sortable_title: Option<String>,

    pub filename: String,
    pub absolute_path: PathBuf,

    pub file_list: Vec<BookFile>,
}

#[derive(Serialize, specta::Type)]
pub struct LibraryAuthor {
    // Define the fields of LibraryAuthor struct here
}

#[derive(Serialize, Deserialize, specta::Type)]
pub enum ImportableBookType {
    EPUB = 0,
    PDF = 1,
    MOBI = 2,
}

impl std::fmt::Display for ImportableBookType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportableBookType::EPUB => write!(f, "EPUB"),
            ImportableBookType::PDF => write!(f, "PDF"),
            ImportableBookType::MOBI => write!(f, "MOBI"),
        }
    }
}

/// Represents metadata for pre-import books, which have a very loose structure.
#[derive(Serialize, Deserialize, specta::Type)]
pub struct ImportableBookMetadata {
    pub file_type: ImportableBookType,
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
