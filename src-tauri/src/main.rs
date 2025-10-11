// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

use tauri::Manager;
use tauri_specta;

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

fn run_tauri_backend() -> std::io::Result<()> {
    // TODO: Update tauri-specta for v2 - for now just disable type generation
    // let specta_builder = tauri_specta::builder()
    //     .commands(tauri_specta::collect_commands![
    //         libs::calibre::clb_cmd_create_book,
    //         // ... other commands
    //     ]);

    tauri::Builder::default()
        // TODO: Re-enable specta plugin when v2 API is figured out
        // .plugin(specta_builder)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_drag::init())
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
