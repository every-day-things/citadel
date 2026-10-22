use std::sync::Arc;

use axum::{
    body::{to_bytes, Body},
    http::{Request, StatusCode},
    Router,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use citadel_core::{contracts::LibraryBookQuery, library::LibraryService, HttpUrlBuilder};
use citadel_opds::{
    credential_store::OpdsCredentialSecret, OpdsBindTarget, OpdsService, OpdsStartConfig,
};
use citadel_server::{api, CalibreCatalogSource};
use libcalibre::{BookAdd, Library};
use serde_json::{json, Value};
use tower::ServiceExt;

async fn fixture() -> (tempfile::TempDir, OpdsService, Router, String) {
    let directory = tempfile::tempdir().unwrap();
    std::fs::copy(
        concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../libcalibre/tests/fixtures/empty_library/metadata.db"
        ),
        directory.path().join("metadata.db"),
    )
    .unwrap();
    let database = libcalibre::util::get_db_path(directory.path().to_str().unwrap()).unwrap();
    let mut library = Library::new(database).unwrap();
    let source = directory.path().join("source.txt");
    std::fs::write(&source, "HTTP contract").unwrap();
    let book = library
        .add_book(BookAdd {
            title: "Shared Contract".into(),
            author_names: vec!["Test Author".into()],
            tags: None,
            series: None,
            series_index: None,
            publisher: None,
            publication_date: None,
            rating: None,
            comments: None,
            identifiers: Default::default(),
            language: None,
            file_paths: vec![source],
        })
        .unwrap();
    drop(library);
    let source = Arc::new(CalibreCatalogSource::open(directory.path()).unwrap());
    let service = OpdsService::with_ephemeral_credentials(
        source.clone(),
        vec![OpdsCredentialSecret {
            username: "reader".into(),
            password: "secret".into(),
        }],
    )
    .unwrap();
    let reservation = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = reservation.local_addr().unwrap().port();
    drop(reservation);
    service
        .start(OpdsStartConfig {
            port: u32::from(port),
            authentication_enabled: true,
            target: OpdsBindTarget::Addresses {
                addresses: vec!["127.0.0.1".into()],
            },
        })
        .await
        .unwrap();
    let router = api::router(source, &service);
    (directory, service, router, book.id.as_i32().to_string())
}

async fn request(
    router: &Router,
    method: &str,
    path: &str,
    body: String,
    authenticated: bool,
) -> (StatusCode, axum::http::HeaderMap, Value) {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header("content-type", "application/json");
    if authenticated {
        request = request.header(
            "authorization",
            format!("Basic {}", STANDARD.encode("reader:secret")),
        );
    }
    let response = router
        .clone()
        .oneshot(request.body(Body::from(body)).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let body = to_bytes(response.into_body(), 4 * 1024 * 1024)
        .await
        .unwrap();
    (status, headers, serde_json::from_slice(&body).unwrap())
}

fn query(limit: Value) -> Value {
    json!({"text":null,"author_id":null,"series_id":null,"tag_id":null,"publisher_id":null,"hide_read":false,"sort":"TitleAsc","limit":limit,"offset":0})
}

#[tokio::test]
async fn http_reads_match_shared_operations_without_changing_database() {
    let (directory, service, router, id) = fixture().await;
    let database_path = directory.path().join("metadata.db");
    let before = std::fs::read(&database_path).unwrap();
    let database = libcalibre::util::get_db_path(directory.path().to_str().unwrap()).unwrap();
    let mut library = Library::open_read_only(database).unwrap();
    let urls = HttpUrlBuilder::new("");
    let mut core = LibraryService::new(&mut library, &urls);
    let input = query(json!(50));
    let expected = core
        .query_books(serde_json::from_value::<LibraryBookQuery>(input.clone()).unwrap())
        .unwrap();
    let (status, _, actual) =
        request(&router, "POST", "/api/books/query", input.to_string(), true).await;
    assert_eq!(status, StatusCode::OK, "{actual}");
    assert_eq!(actual, serde_json::to_value(expected).unwrap());
    let (status, _, actual) = request(
        &router,
        "GET",
        &format!("/api/books/{id}"),
        String::new(),
        true,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        actual,
        serde_json::to_value(core.get_book(&id).unwrap()).unwrap()
    );
    assert!(!actual
        .to_string()
        .contains(directory.path().to_str().unwrap()));
    assert_eq!(std::fs::read(database_path).unwrap(), before);
    service.stop().await;
}

#[tokio::test]
async fn api_auth_errors_bounds_and_schema_are_consistent() {
    let (_directory, service, router, _) = fixture().await;
    let (status, headers, error) =
        request(&router, "GET", "/api/openapi.json", String::new(), false).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert!(headers.contains_key("www-authenticate"));
    assert_eq!(error["code"], "unauthorized");
    let (status, _, schema) =
        request(&router, "GET", "/api/openapi.json", String::new(), true).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(schema, serde_json::to_value(api::openapi()).unwrap());
    assert_eq!(
        schema["components"]["securitySchemes"]["reader"]["scheme"],
        "basic"
    );
    for (method, path, body, expected, code) in [
        (
            "GET",
            "/api/books/bad",
            String::new(),
            400,
            "invalidArgument",
        ),
        ("GET", "/api/books/99999", String::new(), 404, "notFound"),
        (
            "POST",
            "/api/books/query",
            "{".into(),
            400,
            "invalidArgument",
        ),
        (
            "POST",
            "/api/books/query",
            query(Value::Null).to_string(),
            400,
            "invalidArgument",
        ),
        (
            "POST",
            "/api/books/query",
            query(json!(201)).to_string(),
            400,
            "invalidArgument",
        ),
        (
            "DELETE",
            "/api/books/1",
            String::new(),
            405,
            "invalidArgument",
        ),
    ] {
        let (status, _, error) = request(&router, method, path, body, true).await;
        assert_eq!(status.as_u16(), expected, "{error}");
        assert_eq!(error["code"], code);
    }
    let (status, _, count) = request(
        &router,
        "POST",
        "/api/books/query",
        query(json!(0)).to_string(),
        true,
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{count}");
    assert_eq!(count["total"], 1);
    assert_eq!(count["items"], json!([]));
    let (status, _, error) = request(
        &router,
        "POST",
        "/api/books/query",
        "x".repeat(16 * 1024 + 1),
        true,
    )
    .await;
    assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(error["code"], "invalidArgument");
    service.stop().await;
}

#[test]
fn committed_openapi_matches_routes() {
    let committed: Value =
        serde_json::from_str(include_str!("../../../contracts/openapi.json")).unwrap();
    assert_eq!(
        committed,
        serde_json::to_value(api::openapi()).unwrap(),
        "Run bun api:generate"
    );
}
