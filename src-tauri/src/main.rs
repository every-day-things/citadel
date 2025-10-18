// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use specta_typescript::Typescript;
use std::env;
use tauri::Manager;
use tauri_specta::{collect_commands, Builder};

pub mod libs {
    pub mod calibre;
    pub mod file_formats;
    mod util;
}
mod book;
mod state;

fn run_tauri_backend() -> std::io::Result<()> {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // Library and initialization commands
        libs::calibre::init_client,
        libs::calibre::clb_query_is_path_valid_library,
        libs::calibre::clb_cmd_create_library,
        // Book query commands
        libs::calibre::clb_query_list_all_books,
        libs::calibre::clb_query_is_file_importable,
        libs::calibre::clb_query_importable_file_metadata,
        libs::calibre::clb_query_list_all_filetypes,
        // Book manipulation commands
        libs::calibre::clb_cmd_create_book,
        libs::calibre::clb_cmd_update_book,
        libs::calibre::clb_cmd_upsert_book_identifier,
        libs::calibre::clb_cmd_delete_book_identifier,
        // Author query and manipulation commands
        libs::calibre::clb_query_list_all_authors,
        libs::calibre::clb_cmd_create_authors,
        libs::calibre::clb_cmd_update_author,
        libs::calibre::clb_cmd_delete_author,
    ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state::CitadelState::new())
        .invoke_handler(builder.invoke_handler())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(move |app| {
            builder.mount_events(app);

            // Get the main window that was created from config and center it
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.center().unwrap();
            }

            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_drag::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

fn main() -> std::io::Result<()> {
    run_tauri_backend()
}
