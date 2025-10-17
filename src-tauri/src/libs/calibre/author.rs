use libcalibre::{calibre_client::CalibreClient, dtos::author::NewAuthorDto};
use serde::{Deserialize, Serialize};

use crate::book::LibraryAuthor;

impl From<&libcalibre::Author> for LibraryAuthor {
    fn from(author: &libcalibre::Author) -> Self {
        LibraryAuthor {
            id: author.id.to_string(),
            name: author.name.clone(),
            sortable_name: author.sort.clone().unwrap_or("".to_string()),
        }
    }
}

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct NewAuthor {
    name: String,
    sortable_name: Option<String>,
}

impl From<&NewAuthor> for NewAuthorDto {
    fn from(author: &NewAuthor) -> Self {
        let sortable_name = match &author.sortable_name {
            Some(name) => name.clone(),
            None => author.name.clone(),
        };

        NewAuthorDto {
            full_name: author.name.clone(),
            sortable_name,
            external_url: None,
        }
    }
}

pub fn list_all(library_root: String) -> Vec<LibraryAuthor> {
    match libcalibre::util::get_db_path(&library_root) {
        None => vec![],
        Some(database_path) => {
            let mut client = CalibreClient::new(database_path);

            client
                .list_all_authors()
                .map(|author_list| author_list.iter().map(LibraryAuthor::from).collect())
                .unwrap_or_default()
        }
    }
}

pub fn create_authors(library_root: String, new_authors: Vec<NewAuthor>) -> Vec<LibraryAuthor> {
    match libcalibre::util::get_db_path(&library_root) {
        None => vec![],
        Some(database_path) => {
            let mut client = CalibreClient::new(database_path);
            let dtos = new_authors
                .iter()
                .map(NewAuthorDto::from)
                .collect::<Vec<NewAuthorDto>>();

            client
                .create_authors(dtos)
                .map(|author_list| author_list.iter().map(LibraryAuthor::from).collect())
                .unwrap_or_default()
        }
    }
}
