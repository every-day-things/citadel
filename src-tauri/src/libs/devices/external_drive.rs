use super::{Device, DeviceBook, calibre_ext_cache::{MetadataRoot, device_book_from_item}};

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
}
