use super::{Device, DeviceBook, calibre_ext_cache::{MetadataRoot, device_book_from_item, item_from_device_book}};

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

    fn add_book(&self, book: DeviceBook) {
        let mut cache = std::fs::read_to_string(format!("{}/metadata.calibre", self.path)).unwrap();
        let mut p: MetadataRoot = serde_json::from_str(&cache).unwrap();

        let new_item = item_from_device_book(&book);

        p.push(new_item);

        cache = serde_json::to_string(&p).unwrap(); 
        std::fs::write(format!("{}/metadata.calibre", self.path), cache).unwrap();
        
    }
}
