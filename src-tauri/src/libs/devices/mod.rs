use crate::book::LibraryBook;

mod external_drive;
mod calibre_ext_cache;

#[derive(Debug)]
pub struct DeviceBook {
  pub title: String,
  pub authors: Vec<String>,
  pub id: String,
  pub uuid: String,
}

pub trait Device {
  fn list_books(&self) -> Vec<DeviceBook>;
  fn add_book(&self, book: LibraryBook) -> Result<(), String>;
}

pub fn list_books_on_external_drive(path: String) -> Vec<DeviceBook> {
    let device = external_drive::ExternalDrive {
      path,
    };
    device.list_books()
}

#[tauri::command]
#[specta::specta]
pub fn add_book_to_external_drive(path: String, book: LibraryBook) {
    let device = external_drive::ExternalDrive {
      path,
    };
    match device.add_book(book) {
      Ok(_) => println!("Book added to external drive"),
      Err(e) => println!("Error adding book to external drive: {:?}", e),
    }
}