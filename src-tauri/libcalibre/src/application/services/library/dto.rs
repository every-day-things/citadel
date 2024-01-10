use std::path::PathBuf;

use crate::application::services::domain::{author::dto::NewAuthorDto, book::dto::NewBookDto};

pub struct NewLibraryFileDto {
    pub path: PathBuf,
    pub name: String,
    pub size: i64,
    pub mime_type: String,
}

pub struct NewLibraryEntryDto {
    pub book: NewBookDto,
    pub authors: Vec<NewAuthorDto>,
    pub files: Option<Vec<NewLibraryFileDto>>,
}
