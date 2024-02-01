use std::{
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
        external_devices::cache::ExternalLibrary,
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

use crate::book::{BookFile, LibraryBook};

#[tauri::command]
#[specta::specta]
pub fn calibre_send_to_device(library_root: String, device_mount_dir: PathBuf, book: LibraryBook) {
    let database_path = libcalibre::util::get_db_path(&library_root);
    match database_path {
        None => {}
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

            let ext_lib = ExternalLibrary {
                dir: device_mount_dir.to_path_buf(),
            };
            let selected_file = book.file_list.first().unwrap();
            let index = 0;
            let book_id_as_int = book.id.parse::<i32>().unwrap();

            let bwf = book_and_author_service.find_book_with_authors(book_id_as_int);
            match bwf {
                Ok(bwf) => {
                    if let BookFile::Local(local_file) = selected_file {
                        match ext_lib.add_item(bwf, index, &local_file.path) {
                            Ok(_) => println!("Book added to calibre device"),
                            Err(e) => println!("Error adding book to calibre device: {:?}", e),
                        }
                    }
                }
                Err(e) => println!("Error adding book to calibre device: {:?}", e),
            }
        }
    }
}
