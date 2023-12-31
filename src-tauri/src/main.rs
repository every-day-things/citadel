// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

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
    let args: Vec<String> = env::args().collect();
    if args.clone().iter().any(|x| x == "--server") {
        println!("Running in server mode. Well, we would, if we had a server.")
    } else {
        let specta_builder = {
            let specta_builder =
                tauri_specta::ts::builder().commands(tauri_specta::collect_commands![
                    libs::calibre::calibre_load_books_from_db,
                    libs::calibre::get_importable_file_metadata,
                    libs::calibre::check_file_importable,
                    libs::calibre::add_book_to_db_by_metadata,
                    libs::calibre::update_book,
                    libs::calibre::init_client,
                    libs::devices::add_book_to_external_drive,
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
}
