use std::path::Path;

use crate::{
    book::{BookFile, LibraryBook},
    libs::calibre::create_folder_for_author,
};

use super::{
    calibre_ext_cache::{device_book_from_item, item_from_library_book, MetadataRoot},
    Device, DeviceBook,
};

pub struct ExternalDrive {
    pub(crate) path: String,
}

impl Device for ExternalDrive {
    fn list_books(&self) -> Vec<DeviceBook> {
        let cache = std::fs::read_to_string(format!("{}/metadata.calibre", self.path)).unwrap();
        let p: MetadataRoot = serde_json::from_str(&cache).unwrap();
        let books = p.iter().map(device_book_from_item).collect();

        books
    }

    fn add_book(&self, book: LibraryBook) -> Result<(), String> {
        let cache = std::fs::read_to_string(format!("{}/metadata.calibre", self.path))
            .or(Err("Could not find Calibre metadata for disk"))?;
        let mut p: MetadataRoot = serde_json::from_str(&cache).or(Err("Error parsing JSON"))?;

        if let Some(BookFile::Local(file)) = &book.file_list.first() {
            let filename = file.path.file_name().unwrap().to_str().unwrap().to_owned();

            match item_from_library_book(&book) {
                Ok(mut item) => {
                    // Create folder for book's author on drive, copy book to folder
                    let author_path =
                        create_folder_for_author(&self.path, book.author_list[0].name.clone())
                            .or(Err("Failed to create author folder on external drive"))?;
                    let file_path_on_drive = Path::new(&author_path).join(&filename);
                    std::fs::copy(&file.path, file_path_on_drive.clone())
                        .expect("Could not copy file to library folder");

                    // Relative to the root of the drive
                    let file_rel_path = Path::new(&book.author_list[0].name.clone()).join(&filename);
                    item.lpath = file_rel_path.to_str().unwrap().to_string();

                    // Remove all items with the same UUID
                    p.retain(|x| x.uuid != item.uuid);
                    p.push(item);

                    match serde_json::to_string(&p) {
                        Ok(cache) => {
                            if let Err(e) =
                                std::fs::write(format!("{}/metadata.calibre", self.path), cache)
                            {
                                Err(format!("Error writing to external drive: {:?}", e).to_owned())
                            } else {
                                Ok(())
                            }
                        }
                        Err(_) => Err("Error serializing metadata to JSON".to_owned()),
                    }
                }
                Err(_) => Err("Error converting library book to device item".to_owned()),
            }
        } else {
            Err("Book has no local files".to_owned())
        }
    }
}
