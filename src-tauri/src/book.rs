use serde::{Serialize};

#[tauri::command]
#[specta::specta]
pub fn some_struct() -> ExStruct {
    ExStruct {
        some_field: "Hello World".into(),
    }
}

#[derive(Serialize, specta::Type)]
pub struct ExStruct {
    some_field: String,
}

#[tauri::command]
#[specta::specta]
pub fn hello_world(my_name: String) -> String {
    format!("Hello, {my_name}! You've been greeted from Rust!")
}

#[derive(Serialize, specta::Type)]
pub struct LibraryBook {
    // Define the fields of LibraryBook struct here
    pub title: String,
}

#[derive(Serialize, specta::Type)]
pub struct LibraryAuthor {
    // Define the fields of LibraryAuthor struct here
}

pub trait Library {
    fn list_books(&self) -> Vec<LibraryBook>;
    fn list_authors(&self) -> Vec<LibraryAuthor>;
}