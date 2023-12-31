use actix_cors::Cors;
use actix_web::{get, http, web, App, HttpResponse, HttpServer, Responder};
use serde::Serialize;

use crate::libs::calibre::calibre_load_books_from_db;

const PORT: u16 = 61440;
const HOST: &str = "127.0.0.1";

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
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
