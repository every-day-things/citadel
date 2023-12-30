use crate::book::LibraryBook;

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

    fn add_book(&self, book: LibraryBook) {
        let cache = std::fs::read_to_string(format!("{}/metadata.calibre", self.path)).unwrap();
        let mut p: MetadataRoot = serde_json::from_str(&cache).unwrap();
        let item_result = item_from_library_book(&book);

        match item_result {
            Ok(item) => {
                // Remove all items with the same UUID
                p.retain(|x| x.uuid != item.uuid);
                
                p.push(item);
                let new_cache = serde_json::to_string(&p);
                match new_cache {
                    Ok(cache) => {
                        std::fs::write(format!("{}/metadata.calibre", self.path), cache);
                    }
                    Err(e) => {
                        println!("Error adding book to external drive: {:?}", e);
                        return;
                    }
                }
            }
            Err(e) => {
                println!("Error adding book to external drive: {:?}", e);
                return;
            }
        }
    }
}
