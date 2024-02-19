use std::{collections::HashMap, path::PathBuf};

use libcalibre::{client::CalibreClient, Author};

use crate::{
    book::{BookFile, LibraryAuthor, LibraryBook, LocalFile, LocalOrRemote, LocalOrRemoteUrl},
    libs::util,
};

fn to_library_book(
    library_path: &String,
    book: &libcalibre::Book,
    author_list: Vec<Author>,
    file_list: Vec<libcalibre::BookFile>,
) -> LibraryBook {
    LibraryBook {
        title: book.title.clone(),
        author_list: author_list.iter().map(|a| LibraryAuthor::from(a)).collect(),
        id: book.id.to_string(),
        uuid: book.uuid.clone(),

        sortable_title: book.sort.clone(),
        author_sort_lookup: Some(
            author_list
                .iter()
                .map(|a| (a.name.clone(), a.sortable_name()))
                .collect::<HashMap<_, _>>(),
        ),

        file_list: file_list
            .iter()
            .map(|f| {
                let file_name_with_ext = format!("{}.{}", f.name, f.format.to_lowercase());
                BookFile::Local(LocalFile {
                    path: PathBuf::from(library_path)
                        .join(book.path.clone())
                        .join(file_name_with_ext),
                    mime_type: f.format.clone(),
                })
            })
            .collect(),

        cover_image: None,
    }
}

/// Generate a LocalOrRemoteUrl for the cover image of a book, if the file exists
/// on disk.
fn book_cover_image(library_root: &String, book: &libcalibre::Book) -> Option<LocalOrRemoteUrl> {
    let cover_image_path = PathBuf::from(library_root)
        .join(book.path.clone())
        .join("cover.jpg");
    if cover_image_path.exists() {
        let url = util::path_to_asset_url(&cover_image_path);

        Some(LocalOrRemoteUrl {
            kind: LocalOrRemote::Local,
            local_path: Some(cover_image_path),
            url,
        })
    } else {
        None
    }
}

pub fn list_all(library_root: String) -> Vec<LibraryBook> {
    match libcalibre::util::get_db_path(&library_root) {
        None => vec![],
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let results = calibre.find_all().expect("Could not load books from DB");

            results
                .iter()
                .map(|b| {
                    let mut calibre_book =
                        to_library_book(&library_root, &b.book, b.authors.clone(), b.files.clone());
                    calibre_book.cover_image = book_cover_image(&library_root, &b.book);

                    calibre_book
                })
                .collect()
        }
    }
}
