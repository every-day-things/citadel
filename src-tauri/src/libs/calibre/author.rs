use serde::{Deserialize, Serialize};

use crate::book::LibraryAuthor;

impl From<&libcalibre::library::Author> for LibraryAuthor {
    fn from(author: &libcalibre::library::Author) -> Self {
        LibraryAuthor {
            id: author.id.as_i32().to_string(),
            name: author.name.clone(),
            sortable_name: author.sort.clone(),
        }
    }
}

#[derive(Serialize, specta::Type, Deserialize, Clone)]
pub struct NewAuthor {
    pub name: String,
    pub sortable_name: Option<String>,
}
