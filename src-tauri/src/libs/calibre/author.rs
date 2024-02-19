use libcalibre::client::CalibreClient;

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
    match libcalibre::util::get_db_path(&library_root) {
        None => vec![],
        Some(database_path) => {
            let mut client = CalibreClient::new(database_path);

            client
                .list_all_authors()
                .map(|author_list| author_list.iter().map(|a| LibraryAuthor::from(a)).collect())
                .unwrap_or(vec![])
        }
    }
}
