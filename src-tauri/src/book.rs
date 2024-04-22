use std::{collections::HashMap, path::PathBuf};

use chrono::{NaiveDate, NaiveDateTime};
use libcalibre::application::services::{
    domain::{author::dto::NewAuthorDto, book::dto::NewBookDto},
    library::dto::{NewLibraryEntryDto, NewLibraryFileDto},
};
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
    Epub = 0,
    Pdf = 1,
    Mobi = 2,
    Text = 3,
}

impl std::fmt::Display for ImportableBookType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ImportableBookType::Epub => write!(f, "EPUB"),
            ImportableBookType::Pdf => write!(f, "PDF"),
            ImportableBookType::Mobi => write!(f, "MOBI"),
            ImportableBookType::Text => write!(f, "TXT"),
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

impl ImportableBookMetadata {
    pub fn to_new_library_entry_dto(&self) -> NewLibraryEntryDto {
        NewLibraryEntryDto {
            book: NewBookDto {
                title: self.title.clone(),
                timestamp: None,
                pubdate: Some(NaiveDateTime::new(
                    self.publication_date
                        .unwrap_or(NaiveDate::from_ymd(1970, 1, 1)),
                    chrono::NaiveTime::from_hms(0, 0, 0),
                )),
                series_index: 1.0,
                flags: 0,
                has_cover: None,
            },
            authors: match &self.author_names {
                Some(authors) => authors
                    .iter()
                    .map(|name| NewAuthorDto {
                        full_name: name.clone(),
                        sortable_name: "".to_string(),
                        external_url: None,
                    })
                    .collect(),
                None => vec![],
            },
            files: Some(vec![NewLibraryFileDto {
                path: self.path.clone(),
            }]),
        }
    }
}

pub trait Library {
    fn list_books(&self) -> Vec<LibraryBook>;
    fn list_authors(&self) -> Vec<LibraryAuthor>;
}
