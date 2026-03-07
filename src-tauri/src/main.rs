// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use libs::calibre;
#[cfg(debug_assertions)]
use specta_typescript::Typescript;
use tauri::Manager;
use tauri_specta::{collect_commands, Builder};

mod app_updates;
pub mod libs {
    pub mod calibre;
    pub mod file_formats;
    mod util;
}
mod book;
mod hardcover;
mod state;

fn run_tauri_backend() -> std::io::Result<()> {
    let builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        // Library and initialization commands
        calibre::init_client,
        calibre::query::clb_query_is_path_valid_library,
        calibre::command::clb_cmd_create_library,
        // Book query commands
        calibre::query::clb_query_list_all_books,
        calibre::query::clb_query_is_file_importable,
        calibre::query::clb_query_importable_file_metadata,
        calibre::query::clb_query_list_all_filetypes,
        // Book manipulation commands
        calibre::command::clb_cmd_create_book,
        calibre::command::clb_cmd_update_book,
        calibre::command::clb_cmd_upsert_book_identifier,
        calibre::command::clb_cmd_delete_book_identifier,
        // Author query and manipulation commands
        calibre::query::clb_query_list_all_authors,
        calibre::command::clb_cmd_create_authors,
        calibre::command::clb_cmd_update_author,
        calibre::command::clb_cmd_delete_author,
        // Hardcover integration commands
        hardcover::test_hardcover_connection,
        hardcover::fetch_hardcover_metadata_by_isbn,
        hardcover::search_hardcover_books,
        app_updates::clb_cmd_check_for_updates,
        app_updates::clb_cmd_install_update_if_available,
    ]);

    #[cfg(debug_assertions)] // <- Only export on non-release builds
    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
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
