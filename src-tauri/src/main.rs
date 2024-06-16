// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

use specta::ts::{BigIntExportBehavior, ExportConfig};

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
    let specta_builder = {
        let specta_builder = tauri_specta::ts::builder()
            .commands(tauri_specta::collect_commands![
                libs::calibre::clb_query_list_all_books,
                libs::calibre::clb_query_list_all_authors,
                libs::calibre::send_to_device::calibre_send_to_device,
                libs::calibre::clb_query_list_all_filetypes,
                libs::calibre::init_client,
                libs::calibre::clb_query_importable_file_metadata,
                libs::calibre::clb_query_is_file_importable,
                libs::calibre::clb_cmd_create_book,
                libs::calibre::clb_cmd_update_book,
                libs::calibre::clb_query_is_path_valid_library,
                libs::calibre::clb_cmd_create_library,
            ])
            .config(ExportConfig::default().bigint(BigIntExportBehavior::BigInt));

        #[cfg(debug_assertions)] // <- Only export on non-release builds
        let specta_builder = specta_builder.path("../src/bindings.ts");

        specta_builder.into_plugin()
    };

    tauri::Builder::default()
        .setup(|app| {
            let main_window =
                tauri::WindowBuilder::new(app, "main", tauri::WindowUrl::App("index.html".into()))
                    // Hide main app window until UI app is ready & makes visible
                    .visible(false)
                    // UI app controls custom window decorations
                    .title_bar_style(tauri::TitleBarStyle::Overlay)
                    .title("")
                    .build()
                    .expect("failed to create main window");
            main_window.center().unwrap();

            Ok(())
        })
        .plugin(specta_builder)
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
