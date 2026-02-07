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

    pub file_list: Vec<BookFile>,

    pub cover_image: Option<LocalOrRemoteUrl>,

    pub identifier_list: Vec<Identifier>,

    pub description: Option<String>,

    pub is_read: bool,
}

impl LibraryBook {
    pub fn from_library_book(book: &libcalibre::library::Book, library_path: &str) -> Self {
        Self {
            id: book.id.as_i32().to_string(),
            uuid: Some(book.uuid.clone()),
            title: book.title.clone(),
            author_list: book.authors.iter().map(LibraryAuthor::from).collect(),
            sortable_title: book.sortable_title.clone(),
            identifier_list: book.identifiers.iter().map(Identifier::from).collect(),
            description: book.description.clone(),
            is_read: book.is_read,
            cover_image: None,
            file_list: book
                .files
                .iter()
                .map(|file| {
                    let file_name_with_ext =
                        format!("{}.{}", file.name, file.format.to_lowercase());

                    BookFile::Local(LocalFile {
                        path: PathBuf::from(library_path)
                            .join(&book.book_dir_path)
                            .join(file_name_with_ext),
                        mime_type: file.format.clone(),
                    })
                })
                .collect(),
        }
    }
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
    pub fn to_book_add(&self) -> libcalibre::BookAdd {
        libcalibre::BookAdd {
            title: self.title.clone(),
            author_names: self.author_names.clone().unwrap_or_default(),
            tags: if self.tags.is_empty() {
                None
            } else {
                Some(self.tags.clone())
            },
            series: None,
            series_index: None,
            publisher: self.publisher.clone(),
            publication_date: self.publication_date,
            rating: None,
            comments: None,
            identifiers: self
                .identifier
                .as_ref()
                .map(|id| {
                    let mut map = HashMap::new();
                    map.insert("isbn".to_string(), id.clone());
                    map
                })
                .unwrap_or_default(),
            file_paths: vec![self.path.clone()],
        }
    }
}

/// Book identifiers, such as ISBN, DOI, Google Books ID, etc.
#[derive(Serialize, Deserialize, Clone, specta::Type)]
pub struct Identifier {
    pub id: i32,
    pub label: String,
    pub value: String,
}

impl From<&libcalibre::BookIdentifier> for Identifier {
    fn from(identifier: &libcalibre::BookIdentifier) -> Self {
        Identifier {
            id: identifier.id,
            label: identifier.label.clone(),
            value: identifier.value.clone(),
        }
    }
}
