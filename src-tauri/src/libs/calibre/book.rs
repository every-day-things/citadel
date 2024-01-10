use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use libcalibre::{
    application::services::domain::book_and_author::service::BookAndAuthorService,
    infrastructure::domain::{
        author::repository::AuthorRepository, book::repository::BookRepository,
        file::repository::FileRepository,
    }
};

use crate::{book::{BookFile, LibraryBook, LocalOrRemote, LocalOrRemoteUrl}, libs::util};

use super::library;

fn to_library_book(
    library_path: &String,
    book: &libcalibre::Book,
    author_names: Vec<String>,
    file_list: Vec<libcalibre::File>,
) -> LibraryBook {
    LibraryBook {
        title: book.title.clone(),
        author_list: author_names.clone(),
        id: book.id.to_string(),
        uuid: book.uuid.clone(),

        sortable_title: book.sort.clone(),
        author_sort_lookup: Some(
            author_names
                .iter()
                .map(|a| (a.clone(), a.clone()))
                .collect::<HashMap<_, _>>(),
        ),

        filename: "".to_string(),
        absolute_path: PathBuf::new(),

        file_list: file_list
            .iter()
            .map(|f| {
                let file_name_with_ext = format!("{}.{}", f.name, f.format.to_lowercase());
                BookFile {
                    path: PathBuf::from(library_path)
                        .join(book.path.clone())
                        .join(file_name_with_ext),
                    mime_type: f.format.clone(),
                }
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
    let database_path = library::gen_database_path(&library_root);

    let book_repo = Arc::new(Mutex::new(BookRepository::new(&database_path)));
    let author_repo = Arc::new(Mutex::new(AuthorRepository::new(&database_path)));
    let file_repo = Arc::new(Mutex::new(FileRepository::new(&database_path)));

    let mut book_and_author_service = BookAndAuthorService::new(book_repo, author_repo, file_repo);

    let results = book_and_author_service
        .find_all()
        .expect("Could not load books from DB");

    results
        .iter()
        .map(|b| {
            let mut calibre_book = to_library_book(
                &library_root,
                &b.book,
                b.authors.iter().map(|a| a.name.clone()).collect(),
                b.files.clone(),
            );
            calibre_book.cover_image = book_cover_image(&library_root, &b.book);

            calibre_book
        })
        .collect()
}
