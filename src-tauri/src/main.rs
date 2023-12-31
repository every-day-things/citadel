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

use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use serde::Serialize;

use crate::libs::calibre::calibre_load_books_from_db;

struct AppState {
    library_path: String,
}

#[derive(Serialize)]
struct Items<T> {
    items: Vec<T>,
}

#[get("/books")]
async fn list_books(data: web::Data<AppState>) -> impl Responder {
    let books = calibre_load_books_from_db(data.library_path.clone());
    HttpResponse::Ok().json(Items { items: books })
}

const SERVER_FLAG: &str = "--server";
const PORT: u16 = 61440;
const HOST: &str = "127.0.0.1";

fn is_server(args: &Vec<String>) -> bool {
    args.iter().any(|x| x == SERVER_FLAG)
}

async fn run_http_server(args: &Vec<String>) -> std::io::Result<()> {
    let calibre_library_path = args
        .iter()
        .find(|x| x.starts_with("--calibre-library="))
        .unwrap()
        .split("=")
        .collect::<Vec<&str>>()[1]
        .to_string();
    println!("Running in server mode.");
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(AppState {
                library_path: calibre_library_path.to_string(),
            }))
            .service(list_books)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}

fn run_tauri_backend() -> std::io::Result<()> {
    let specta_builder = {
        let specta_builder = tauri_specta::ts::builder().commands(tauri_specta::collect_commands![
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

    Ok(tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .plugin(specta_builder)
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_drag::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let args: Vec<String> = env::args().collect();

    if is_server(&args) {
        run_http_server(&args).await
    } else {
        run_tauri_backend()
    }
}
