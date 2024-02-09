use std::{collections::HashMap, path::PathBuf};

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub enum LocalOrRemote {
    Local,
    Remote,
}

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct LocalOrRemoteUrl {
    pub kind: LocalOrRemote,
    pub url: String,
    pub local_path: Option<PathBuf>,
}
#[derive(Serialize, specta::Type, Deserialize, Clone, Debug)]
pub struct LocalFile {
    /// The absolute path to the file, including extension.
    pub path: PathBuf,
    /// The MIME type of the file. Common values are `application/pdf` and `application/epub+zip`.
    pub mime_type: String,
}

#[derive(Serialize, specta::Type, Deserialize, Clone, Debug)]
pub struct RemoteFile {
    pub url: String,
}

#[derive(Serialize, specta::Type, Deserialize, Clone, Debug)]
pub enum BookFile {
    Local(LocalFile),
    Remote(RemoteFile),
}

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct LibraryBook {
    pub id: String,
    pub uuid: Option<String>,
    pub title: String,
    pub author_list: Vec<LibraryAuthor>,

    pub sortable_title: Option<String>,
    pub author_sort_lookup: Option<HashMap<String, String>>,

    pub file_list: Vec<BookFile>,

    pub cover_image: Option<LocalOrRemoteUrl>,
}

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct LibraryAuthor {
    pub id: String,
    pub name: String,
    pub sortable_name: String,
}

#[derive(Serialize, Deserialize, specta::Type)]
pub enum ImportableBookType {
    EPUB = 0,
    PDF = 1,
    MOBI = 2,
    TEXT = 3,
}

impl std::fmt::Display for ImportableBookType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportableBookType::EPUB => write!(f, "EPUB"),
            ImportableBookType::PDF => write!(f, "PDF"),
            ImportableBookType::MOBI => write!(f, "MOBI"),
            ImportableBookType::TEXT => write!(f, "TXT"),
        }
    }
}

/// Represents metadata for pre-import books, which have a very loose structure.
#[derive(Serialize, Deserialize, specta::Type)]
pub struct ImportableBookMetadata {
    pub file_type: ImportableBookType,
    /// The title of the book, if one is available, or the name of the file to import.
    pub title: String,
    /// The list of authors of the book, if available. Some books may not be formatted correctly,
    /// and will have no authors, or all author names will be one string separated by "," or ";".
    pub author_names: Option<Vec<String>>,
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
