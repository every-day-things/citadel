use std::path::{Path, PathBuf};
use std::str::FromStr;

use chrono::NaiveDate;
use epub::doc::EpubDoc;

use crate::book::{ImportableBookMetadata, ImportableBookType};

use super::calibre::ImportableFile;

pub enum SupportedFormats {
    EPUB,
    MOBI,
    UNKNOWN,
}
impl SupportedFormats {
    pub fn list_all() -> Vec<&'static str> {
        vec!["epub", "mobi"]
    }

    pub fn is_supported(ext: &str) -> bool {
        Self::from_file_extension(ext).is_some()
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            Self::EPUB => "epub",
            Self::MOBI => "mobi",
            Self::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(Self::EPUB),
            "mobi" => Some(Self::MOBI),
            _ => None,
        }
    }
}

/// Validate if a file at some path is importable.
/// Ensures the file exists and has a supported file extension.
pub fn validate_file_importable(path: &Path) -> Option<ImportableFile> {
    if !&path.exists() {
        return None;
    }
    let ext = &path.extension().and_then(|s| s.to_str()).unwrap_or("");

    match SupportedFormats::from_file_extension(ext) {
        Some(_) => Some(ImportableFile {
            path: PathBuf::from(path),
        }),
        _ => None,
    }
}

pub fn get_importable_file_metadata(file: ImportableFile) -> Option<ImportableBookMetadata> {
    let ext = &file.path.extension().and_then(|s| s.to_str()).unwrap_or("");
    let format = SupportedFormats::from_file_extension(ext);

    match format {
        Some(SupportedFormats::EPUB) => {
            let metadata = read_epub_metadata(&file.path);
            Some(ImportableBookMetadata {
                file_type: ImportableBookType::EPUB,
                title: metadata.title.unwrap_or("".to_string()),
                author_names: metadata.creator_list,
                language: metadata.language,
                publisher: metadata.publisher,
                identifier: metadata.identifier,
                path: file.path,
                file_contains_cover: metadata.cover_image_data.is_some(),
                tags: metadata.subjects,
                publication_date: NaiveDate::from_str(
                    metadata.publication_date.unwrap_or("".to_string()).as_str(),
                )
                .ok(),
            })
        }
        _ => None,
    }
}

pub struct EpubMetadata {
    pub title: Option<String>,
    pub creator_list: Option<Vec<String>>,
    pub identifier: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<String>,
    pub language: Option<String>,
    pub cover_image_data: Option<Vec<u8>>,
    pub subjects: Vec<String>,
}

pub fn cover_data(path: &Path) -> Option<Vec<u8>> {
    let doc = EpubDoc::new(path);
    assert!(doc.is_ok());
    let mut doc = doc.unwrap();

    doc.get_cover().map(|(data, _id)| data)
}

pub fn read_epub_metadata(path: &Path) -> EpubMetadata {
    let doc = EpubDoc::new(path);
    assert!(doc.is_ok());
    let mut doc = doc.unwrap();
    let creators = doc
        .metadata
        .get("creator")
        .map(|v| v.to_vec())
        .unwrap_or(Vec::new());

    EpubMetadata {
        title: doc.mdata("title"),
        creator_list: Some(creators),
        identifier: doc.mdata("identifier"),
        publisher: doc.mdata("publisher"),
        language: doc.mdata("language"),
        cover_image_data: doc.get_cover().map(|(data, _id)| data),
        publication_date: doc.mdata("date"),
        subjects: doc
            .metadata
            .get("subject")
            .map(|v| v.to_vec())
            .unwrap_or(Vec::new()),
    }
}
