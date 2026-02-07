use std::path::PathBuf;

use crate::state::CitadelState;

use chrono::NaiveDateTime;
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
    pub fn to_library_update(&self) -> libcalibre::BookUpdate {
        libcalibre::BookUpdate {
            title: self.title.clone(),
            author_names: None,
            author_ids: self.author_id_list.as_ref().map(|ids| {
                ids.iter()
                    .filter_map(|id| id.parse::<i32>().ok())
                    .map(libcalibre::AuthorId::from)
                    .collect()
            }),
            description: self.description.clone(),
            is_read: self.is_read,
            publication_date: self.publication_date.map(|dt| dt.date()),
            tags: None,
            series: None,
            series_index: None,
            publisher: None,
            rating: None,
            comments: None,
            identifiers: None,
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
    pub fn to_library_update(&self) -> libcalibre::AuthorUpdate {
        libcalibre::AuthorUpdate {
            name: self.full_name.clone(),
            sort: self.sortable_name.clone(),
            link: self.external_url.clone(),
        }
    }
}
