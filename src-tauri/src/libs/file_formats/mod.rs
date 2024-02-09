use chrono::NaiveDate;
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use super::calibre::ImportableFile;
use crate::book::{ImportableBookMetadata, ImportableBookType};

mod epub;
mod mobi;
mod pdf;
mod txt;

#[derive(Serialize, Clone, Copy, specta::Type)]
pub enum SupportedFormats {
    EPUB,
    MOBI,
    PDF,
    KF7, // Kindle Format 7 — AZW files
    KF8, // Kindle Format 8 — AZW3 files
    TXT,
    UNKNOWN,
}

impl SupportedFormats {
    fn variants() -> &'static [SupportedFormats] {
        &[
            SupportedFormats::EPUB,
            SupportedFormats::MOBI,
            SupportedFormats::PDF,
            SupportedFormats::KF7,
            SupportedFormats::KF8,
            SupportedFormats::TXT,
            SupportedFormats::UNKNOWN,
        ]
    }

    pub fn list_all() -> Vec<(SupportedFormats, &'static str)> {
        SupportedFormats::variants()
            .iter()
            .map(|v| (*v, v.to_file_extension()))
            .collect()
    }

    pub fn is_supported(ext: &str) -> bool {
        Self::from_file_extension(ext).is_some()
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            Self::EPUB => "epub",
            Self::MOBI => "mobi",
            Self::PDF => "pdf",
            Self::KF7 => "azw",
            Self::KF8 => "azw3",
            Self::TXT => "txt",
            Self::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(Self::EPUB),
            "mobi" => Some(Self::MOBI),
            "pdf" => Some(Self::PDF),
            "azw" => Some(Self::KF7),
            "azw3" => Some(Self::KF8),
            "txt" => Some(Self::TXT),
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
        Some(SupportedFormats::EPUB) => match epub::read_metadata(&file.path) {
            Some(metadata) => Some(ImportableBookMetadata {
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
            }),
            _ => None,
        },
        Some(SupportedFormats::MOBI)
        | Some(SupportedFormats::KF7)
        | Some(SupportedFormats::KF8) => match mobi::read_metadata(&file.path) {
            Some(metadata) => Some(ImportableBookMetadata {
                file_type: ImportableBookType::MOBI,
                title: metadata.title,
                author_names: Some(vec![metadata.author]),
                identifier: None,
                publisher: Some(metadata.publisher),
                language: Some(metadata.language),
                tags: metadata.subjects,
                path: file.path,
                publication_date: metadata.pub_date,
                file_contains_cover: true,
            }),
            _ => None,
        },
        Some(SupportedFormats::PDF) => match pdf::read_metadata(&file.path) {
            Some(metadata) => Some(metadata.to_importable_book_metadata()),
            _ => None,
        },
        Some(SupportedFormats::TXT) => match txt::read_metadata(&file.path) {
            Some(metadata) => Some(metadata.to_importable_book_metadata()),
            _ => None,
        },
        _ => None,
    }
}
