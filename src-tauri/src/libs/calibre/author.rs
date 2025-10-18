use libcalibre::dtos::author::NewAuthorDto;
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
