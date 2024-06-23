use crate::dtos::author::NewAuthorDto;
use std::path::PathBuf;

use super::book::{NewBookDto, UpdateBookDto};

pub struct NewLibraryFileDto {
    pub path: PathBuf,
    //pub name: String,
    //pub size: i64,
    //pub mime_type: String,
}

pub struct UpdateLibraryEntryDto {
    pub book: UpdateBookDto,
    pub author_id_list: Option<Vec<String>>,
}

pub struct NewLibraryEntryDto {
    pub book: NewBookDto,
    pub authors: Vec<NewAuthorDto>,
    pub files: Option<Vec<NewLibraryFileDto>>,
}
