// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use tauri::Manager;

// TODO: Re-enable tauri-specta v2 integration once API is stable
// #[cfg(debug_assertions)]
// use tauri_specta::{collect_commands, Builder};

pub mod libs {
    pub mod calibre;
    pub mod file_formats;
    mod util;
}
mod book;
mod http;

const SERVER_FLAG: &str = "--server";

fn is_server(args: &[String]) -> bool {
    args.iter().any(|x| x == SERVER_FLAG)
}

// TODO: Re-enable tauri-specta v2 integration once API is stable
// #[cfg(debug_assertions)]
// fn setup_specta() -> Result<(), Box<dyn std::error::Error>> {
//     // Implementation pending tauri-specta v2 stable API
//     Ok(())
// }

fn run_tauri_backend() -> std::io::Result<()> {
    // TODO: Re-enable TypeScript generation once tauri-specta v2 API is stable
    // #[cfg(debug_assertions)]
    // {
    //     if let Err(e) = setup_specta() {
    //         eprintln!("Failed to generate TypeScript bindings: {}", e);
    //     }
    // }

    tauri::Builder::default()
        .setup(|app| {
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
        .invoke_handler(tauri::generate_handler![
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if is_server(&args) {
        http::run_http_server(&args).await
    } else {
        run_tauri_backend()
    }
}