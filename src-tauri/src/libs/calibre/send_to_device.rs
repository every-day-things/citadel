use std::path::PathBuf;

use libcalibre::{
    application::services::external_devices::cache::ExternalLibrary, client::CalibreClient,
};

use crate::book::{BookFile, LibraryBook};

#[tauri::command]
#[specta::specta]
pub fn calibre_send_to_device(library_root: String, device_mount_dir: PathBuf, book: LibraryBook) {
    match libcalibre::util::get_db_path(&library_root) {
        None => {}
        Some(database_path) => {
            let mut calibre = CalibreClient::new(database_path);

            let ext_lib = ExternalLibrary {
                dir: device_mount_dir.to_path_buf(),
            };
            let selected_file = book.file_list.first().unwrap();
            let index = 0;
            let book_id_as_int = book.id.parse::<i32>().unwrap();

            let bwf = calibre.find_book_with_authors(book_id_as_int);
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
