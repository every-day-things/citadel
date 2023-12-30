// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use libs::devices::list_books_on_external_drive;

use crate::{libs::devices::add_book_to_external_drive, book::LibraryBook};

pub mod libs {
    pub mod calibre;
    pub mod devices;
    pub mod file_formats;
}
mod book;
mod templates;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    // print output from list_books_on_external_drive() to console
    add_book_to_external_drive(
        String::from("/Users/phil/dev/macos-book-app/External Drive"),
        LibraryBook {
            title: String::from("Test Book"),
            author_list: vec![String::from("Test Author")],
            id: String::from("1234"),
            uuid: Some(String::from("1-2-3-4")),
            sortable_title: None,
        },
    );
    println!(
        "books on ext drive: {:?}",
        list_books_on_external_drive(String::from(
            "/Users/phil/dev/macos-book-app/External Drive"
        ))
    );
    let specta_builder = {
        let specta_builder = tauri_specta::ts::builder().commands(tauri_specta::collect_commands![
            book::hello_world,
            libs::calibre::load_books_from_db,
            libs::calibre::get_importable_file_metadata,
            libs::calibre::check_file_importable,
            libs::calibre::add_book_to_db_by_metadata,
            libs::calibre::update_book,
        ]);

        #[cfg(debug_assertions)] // <- Only export on non-release builds
        let specta_builder = specta_builder.path("../src/bindings.ts");

        specta_builder.into_plugin()
    };

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .plugin(specta_builder)
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_drag::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
