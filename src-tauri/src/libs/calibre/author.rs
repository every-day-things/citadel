use std::sync::{Arc, Mutex};

use libcalibre::{
    application::services::domain::author::service::{AuthorService, AuthorServiceTrait},
    infrastructure::domain::author::repository::AuthorRepository,
};

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

pub fn list_all(library_root: String) -> Vec<LibraryAuthor> {
    let database_path = libcalibre::util::get_db_path(&library_root);
    match database_path {
        None => vec![],
        Some(database_path) => {
            let author_repo = Box::new(AuthorRepository::new(&database_path));
            let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));

            {
                let mut guarded_as = author_service.lock().unwrap();
                match guarded_as.all() {
                    Ok(authors) => authors.iter().map(|a| LibraryAuthor::from(a)).collect(),
                    Err(_) => vec![],
                }
            }
        }
    }
}
