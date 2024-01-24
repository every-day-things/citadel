use std::path::Path;

use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use serde::Serialize;
use tauri::api::file;

use crate::{
    book::{LocalOrRemote, LocalOrRemoteUrl},
    libs::calibre::calibre_load_books_from_db,
};

const PORT: u16 = 61440;
const HOST: &str = "0.0.0.0";

struct AppState {
    library_path: String,
}

#[derive(Serialize)]
struct Items<T> {
    items: Vec<T>,
}

#[get("/covers/{book_id}.jpg")]
async fn get_asset(data: web::Data<AppState>, book_id: web::Path<String>) -> impl Responder {
    let book_id_val = book_id.into_inner();

    let books = calibre_load_books_from_db(data.library_path.clone());
    let book_cover_path = format!(
        "{}/{}/cover.jpg",
        data.library_path,
        books
            .iter()
            .find(|x| x.id.to_string() == book_id_val)
            .unwrap()
            .cover_image
            .clone()
            .unwrap()
            .url
            .clone()
    );

    let file_path = Path::new(&book_cover_path);
    HttpResponse::Ok()
        .content_type("image/jpeg")
        .body(file::read_binary(file_path).unwrap())
}

#[get("/books")]
async fn list_books(data: web::Data<AppState>) -> impl Responder {
    let books = calibre_load_books_from_db(data.library_path.clone())
        .iter()
        .map(|x| {
            let mut x = x.clone();
            x.cover_image = Some(LocalOrRemoteUrl {
                kind: LocalOrRemote::Remote,
                url: format!("https://citadel-backend.fly.dev/covers/{}.jpg", x.id),
                local_path: None,
            });
            x
        })
        .collect::<Vec<_>>();
    HttpResponse::Ok().json(Items { items: books })
}

pub async fn run_http_server(args: &Vec<String>) -> std::io::Result<()> {
    let calibre_library_path = args
        .iter()
        .find(|x| x.starts_with("--calibre-library="))
        .unwrap()
        .split("=")
        .collect::<Vec<&str>>()[1]
        .to_string();
    println!("Running in server mode.");
    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(AppState {
                library_path: calibre_library_path.to_string(),
            }))
            .service(list_books)
            .service(get_asset)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
