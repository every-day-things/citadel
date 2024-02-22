use std::path::Path;

use actix_cors::Cors;
use actix_web::{get, web, App, HttpResponse, HttpServer, Responder};
use serde::Serialize;
use tauri::api::file;

use libcalibre::mime_type::MIMETYPE;

use crate::{
    book::{BookFile, LocalOrRemote, LocalOrRemoteUrl, RemoteFile},
    libs::calibre::clb_query_list_all_books,
};

const PORT: u16 = 61440;
const HOST: &str = "0.0.0.0";
const URL: &str = "https://citadel-backend.fly.dev";
// const URL: &str = "http://localhost:61440";

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

    let books = clb_query_list_all_books(data.library_path.clone());
    let book_cover_path = books
        .iter()
        .find(|x| x.id == book_id_val)
        .unwrap()
        .cover_image
        .clone()
        .unwrap()
        .local_path
        .unwrap();

    let file_path = Path::new(&book_cover_path);
    HttpResponse::Ok()
        .content_type("image/jpeg")
        .body(file::read_binary(file_path).unwrap())
}
#[get("/download/{book_id}/{file_name}.{file_type}")]
async fn get_book_file(
    data: web::Data<AppState>,
    path: web::Path<(String, String, String)>,
) -> impl Responder {
    let (book_id, _file_name, file_type) = path.into_inner();
    let books = clb_query_list_all_books(data.library_path.clone());

    let file_with_mimetype = books
        .iter()
        .find(|x| x.id == book_id)
        .unwrap()
        .file_list
        .iter()
        .filter_map(|x| match x {
            BookFile::Local(local_file) => Some(local_file),
            _ => None,
        })
        .find(|x| {
            MIMETYPE::from_file_extension(&x.mime_type)
                .map(|m| m == MIMETYPE::from_file_extension(&file_type).unwrap())
                .unwrap_or(false)
        });

    match file_with_mimetype {
        Some(file) => {
            let file_path = Path::new(&file.path);
            HttpResponse::Ok()
                .content_type(file.mime_type.clone())
                .body(file::read_binary(file_path).unwrap())
        }
        None => HttpResponse::NotFound().body("File not found"),
    }
}

#[get("/books")]
async fn list_books(data: web::Data<AppState>) -> impl Responder {
    let books = clb_query_list_all_books(data.library_path.clone())
        .iter()
        .map(|x| {
            let mut x = x.clone();
            x.cover_image = Some(LocalOrRemoteUrl {
                kind: LocalOrRemote::Remote,
                url: format!("{}/covers/{}.jpg", URL, x.id),
                local_path: None,
            });
            x.file_list = x
                .file_list
                .iter()
                .map(|f| match f {
                    crate::book::BookFile::Local(f) => crate::book::BookFile::Remote(RemoteFile {
                        url: format!(
                            "{}/download/{}/{}.{}",
                            URL,
                            x.id,
                            x.title.replace(' ', "%20"), // TODO: use `urlencoding` crate
                            &f.mime_type
                        ),
                    }),
                    file => file.clone(),
                })
                .collect();
            x
        })
        .collect::<Vec<_>>();
    HttpResponse::Ok().json(Items { items: books })
}

pub async fn run_http_server(args: &[String]) -> std::io::Result<()> {
    let calibre_library_path = args
        .iter()
        .find(|x| x.starts_with("--calibre-library="))
        .unwrap()
        .split('=')
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
            .service(get_book_file)
    })
    .bind((HOST, PORT))?
    .run()
    .await
}
