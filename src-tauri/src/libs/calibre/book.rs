use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use libcalibre::{
    application::services::{
        domain::{
            author::service::{AuthorService, AuthorServiceTrait},
            book::service::{BookService, BookServiceTrait},
            file::service::{BookFileService, BookFileServiceTrait},
        },
        library::service::LibraryService,
    },
    infrastructure::{
        domain::{
            author::repository::AuthorRepository, book::repository::BookRepository,
            book_file::repository::BookFileRepository,
        },
        file_service::FileServiceTrait,
    },
};

use crate::{
    book::{BookFile, LibraryBook, LocalOrRemote, LocalOrRemoteUrl},
    libs::util,
};

fn to_library_book(
    library_path: &String,
    book: &libcalibre::Book,
    author_names: Vec<String>,
    file_list: Vec<libcalibre::BookFile>,
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
    let database_path = libcalibre::util::get_db_path(&library_root);
    match database_path {
        None => {
            // No database file → no books.
            vec![]
        }
        Some(database_path) => {
            let book_repo = Box::new(BookRepository::new(&database_path));
            let author_repo = Box::new(AuthorRepository::new(&database_path));
            let book_file_repo = Box::new(BookFileRepository::new(&database_path));

            let book_service = Arc::new(Mutex::new(BookService::new(book_repo)));
            let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));
            let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
            let file_service = Arc::new(Mutex::new(
                libcalibre::infrastructure::file_service::FileService::new(&library_root),
            ));

            let mut book_and_author_service = LibraryService::new(
                book_service,
                author_service,
                file_service,
                book_file_service,
            );

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
    }
}
