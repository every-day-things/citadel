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

    fn add_book(&self, book: LibraryBook) -> Result<(), String> {
        let cache = std::fs::read_to_string(format!("{}/metadata.calibre", self.path))
            .or(Err("Could not find Calibre metadata for disk"))?;
        let mut p: MetadataRoot = serde_json::from_str(&cache).or(Err("Error parsing JSON"))?;

        match item_from_library_book(&book) {
            Ok(item) => {
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
    }
}
