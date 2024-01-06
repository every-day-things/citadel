// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;

use libcalibre::{
    application::services::domain::book::{dto::UpdateBookDto, service::BookService},
    infrastructure::domain::book::repository::BookRepository,
};
use specta::ts::{BigIntExportBehavior, ExportConfig};

pub mod libs {
    pub mod calibre;
    pub mod devices;
    pub mod file_formats;
}
mod book;
mod http;
mod templates;

const SERVER_FLAG: &str = "--server";

fn is_server(args: &Vec<String>) -> bool {
    args.iter().any(|x| x == SERVER_FLAG)
}

fn run_tauri_backend() -> std::io::Result<()> {
    let specta_builder = {
        let specta_builder = tauri_specta::ts::builder()
            .commands(tauri_specta::collect_commands![
                libs::calibre::calibre_load_books_from_db,
                libs::calibre::get_importable_file_metadata,
                libs::calibre::check_file_importable,
                libs::calibre::add_book_to_db_by_metadata,
                libs::calibre::update_book,
                libs::calibre::init_client,
                libs::devices::add_book_to_external_drive,
            ])
            .config(ExportConfig::default().bigint(BigIntExportBehavior::BigInt));

        #[cfg(debug_assertions)] // <- Only export on non-release builds
        let specta_builder = specta_builder.path("../src/bindings.ts");

        specta_builder.into_plugin()
    };

    Ok(tauri::Builder::default()
        .plugin(specta_builder)
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_drag::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();

    let book_repo =
        BookRepository::new("/Users/phil/dev/macos-book-app/sample-library/metadata.db");
    let mut book_service = BookService::new(book_repo);
    let updated = book_service.update(
        317,
        UpdateBookDto {
            title: Some("Test Book 3".to_string()),
            author_list: None,
            timestamp: None,
            pubdate: None,
            series_index: None,
            isbn: None,
            lccn: None,
            flags: None,
            has_cover: None,
        },
    );
    println!("{:?}", updated);

    let book_list = book_service.all();
    println!("{:?}", book_list);
    // let new_book = book_service.create(NewBookDto {
    //     title: "Test Book 2".to_string(),
    //     author_list: vec!["Logic".to_string()],
    //     timestamp: None,
    //     pubdate: None,
    //     series_index: 0.0,
    //     isbn: None,
    //     lccn: None,
    //     flags: 0,
    //     has_cover: Some(false),
    // });

    if is_server(&args) {
        http::run_http_server(&args).await
    } else {
        run_tauri_backend()
    }
}
