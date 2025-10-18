use std::path::PathBuf;

use crate::state::CitadelState;

use chrono::NaiveDateTime;
use libcalibre::dtos::author::UpdateAuthorDto;
use libcalibre::dtos::book::UpdateBookDto;
use libcalibre::dtos::library::UpdateLibraryEntryDto;
use serde::Deserialize;
use serde::Serialize;

mod author;
mod book;

pub mod command;
pub mod query;

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct ImportableFile {
    pub(crate) path: PathBuf,
}

#[derive(Serialize, specta::Type)]
pub struct CalibreClientConfig {
    library_path: String,
}

#[tauri::command]
#[specta::specta]
pub fn init_client(
    state: tauri::State<CitadelState>,
    library_path: String,
) -> Result<CalibreClientConfig, String> {
    state.init_library(library_path.clone())?;
    Ok(CalibreClientConfig {
        library_path: library_path.clone(),
    })
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct BookUpdate {
    pub author_id_list: Option<Vec<String>>,
    pub title: Option<String>,
    pub timestamp: Option<NaiveDateTime>,
    pub publication_date: Option<NaiveDateTime>,
    pub is_read: Option<bool>,
    pub description: Option<String>,
}

impl BookUpdate {
    pub fn to_dto(&self) -> UpdateLibraryEntryDto {
        UpdateLibraryEntryDto {
            book: UpdateBookDto {
                title: self.title.clone(),
                timestamp: self.timestamp,
                pubdate: self.publication_date,
                is_read: self.is_read,
                description: self.description.clone(),
                ..UpdateBookDto::default()
            },
            author_id_list: self.author_id_list.clone(),
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type, Debug)]
pub struct AuthorUpdate {
    pub full_name: Option<String>,
    pub sortable_name: Option<String>,
    pub external_url: Option<String>,
}

impl AuthorUpdate {
    pub fn to_dto(&self) -> UpdateAuthorDto {
        UpdateAuthorDto {
            full_name: self.full_name.clone(),
            sortable_name: self.sortable_name.clone(),
            external_url: self.external_url.clone(),
        }
    }
}
