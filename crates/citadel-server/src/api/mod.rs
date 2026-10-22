//! Read-only JSON API. Contracts and application behavior live in citadel-core.
use std::{net::SocketAddr, sync::Arc};

use axum::{
    body::{to_bytes, Body},
    extract::{rejection::JsonRejection, Path, Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json, Router,
};
use citadel_core::{
    contracts::{LibraryBookPage, LibraryBookQuery},
    error::{LibraryError, LibraryErrorCode},
    library::LibraryService,
    HttpUrlBuilder, LibraryBook,
};
use serde::Deserialize;
use tokio::sync::Semaphore;
use utoipa::openapi::{
    security::{Http, HttpAuthScheme, SecurityScheme},
    OpenApi,
};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::CalibreCatalogSource;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApiConfig {
    pub listen: SocketAddr,
}

#[derive(Clone)]
struct ApiState {
    source: Arc<CalibreCatalogSource>,
    work: Arc<Semaphore>,
}

// Keep slots inside blocking tasks so timed-out HTTP requests cannot queue
// unlimited work waiting for the shared SQLite connection.
async fn run<T: Send + 'static>(
    state: ApiState,
    operation: impl FnOnce(&mut LibraryService<'_>) -> Result<T, LibraryError> + Send + 'static,
) -> Result<T, ApiFailure> {
    let permit = state
        .work
        .try_acquire_owned()
        .map_err(|_| LibraryError::unavailable())?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        let mut library = state
            .source
            .library
            .lock()
            .map_err(|_| LibraryError::unavailable())?;
        operation(&mut LibraryService::new(
            &mut library,
            &HttpUrlBuilder::new(""),
        ))
    })
    .await
    .map_err(|_| LibraryError::unavailable())?
    .map_err(Into::into)
}

pub struct ApiFailure(LibraryError);
impl From<LibraryError> for ApiFailure {
    fn from(error: LibraryError) -> Self {
        Self(error)
    }
}
impl IntoResponse for ApiFailure {
    fn into_response(mut self) -> Response {
        let status = match self.0.code {
            LibraryErrorCode::InvalidArgument => StatusCode::BAD_REQUEST,
            LibraryErrorCode::Unauthorized => StatusCode::UNAUTHORIZED,
            LibraryErrorCode::RateLimited => StatusCode::TOO_MANY_REQUESTS,
            LibraryErrorCode::NotFound => StatusCode::NOT_FOUND,
            LibraryErrorCode::Unavailable => StatusCode::SERVICE_UNAVAILABLE,
            LibraryErrorCode::Internal => StatusCode::INTERNAL_SERVER_ERROR,
        };
        if self.0.code == LibraryErrorCode::Internal {
            // Database/filesystem diagnostics may include private server paths.
            self.0.message = "Library operation failed".into();
        }
        let mut response = (status, Json(self.0)).into_response();
        if status == StatusCode::SERVICE_UNAVAILABLE {
            response
                .headers_mut()
                .insert(header::RETRY_AFTER, "1".parse().unwrap());
        }
        response
    }
}

#[utoipa::path(post, path = "/api/books/query", operation_id = "queryBooks",
    request_body = LibraryBookQuery,
    description = "Query the configured library. HTTP requires an explicit limit between 0 and 200; zero returns only the total. No arbitrary library paths are accepted.",
    responses((status = 200, body = LibraryBookPage), (status = 400, body = LibraryError),
        (status = 401, body = LibraryError), (status = 429, body = LibraryError), (status = 413, body = LibraryError),
        (status = 503, body = LibraryError), (status = 500, body = LibraryError)),
    security(("reader" = [])))]
async fn query_books(
    State(state): State<ApiState>,
    query: Result<Json<LibraryBookQuery>, JsonRejection>,
) -> Result<Json<LibraryBookPage>, ApiFailure> {
    let Json(query) = query.map_err(|_| LibraryError::invalid("Invalid book query JSON"))?;
    if !matches!(query.limit, Some(0..=200)) {
        return Err(
            LibraryError::invalid("HTTP book queries require a limit between 0 and 200").into(),
        );
    }
    Ok(Json(
        run(state, move |service| service.query_books(query)).await?,
    ))
}

#[utoipa::path(get, path = "/api/books/{book_id}", operation_id = "getBook",
    params(("book_id" = String, Path, description = "Library book ID")),
    responses((status = 200, body = LibraryBook), (status = 400, body = LibraryError),
        (status = 401, body = LibraryError), (status = 429, body = LibraryError), (status = 404, body = LibraryError),
        (status = 503, body = LibraryError), (status = 500, body = LibraryError)),
    security(("reader" = [])))]
async fn get_book(
    State(state): State<ApiState>,
    Path(id): Path<String>,
) -> Result<Json<LibraryBook>, ApiFailure> {
    Ok(Json(
        run(state, move |service| service.get_book(&id)).await?,
    ))
}

fn routes() -> OpenApiRouter<ApiState> {
    OpenApiRouter::new().routes(routes!(query_books, get_book))
}

pub fn openapi() -> OpenApi {
    let (_, mut schema) = routes().split_for_parts();
    schema.info.title = "Citadel library API".into();
    schema.info.version = "1".into();
    schema
        .components
        .as_mut()
        .expect("API has schemas")
        .add_security_scheme(
            "reader",
            SecurityScheme::Http(Http::new(HttpAuthScheme::Basic)),
        );
    schema
}

pub fn router(source: Arc<CalibreCatalogSource>, service: &citadel_opds::OpdsService) -> Router {
    let (router, _) = routes().split_for_parts();
    let schema = openapi();
    let router = router
        .with_state(ApiState {
            source,
            work: Arc::new(Semaphore::new(64)),
        })
        .route(
            "/api/openapi.json",
            axum::routing::get(move || {
                let schema = schema.clone();
                async move { Json(schema) }
            }),
        );
    service
        .protect_http_routes(router)
        .layer(axum::middleware::from_fn(normalize_errors))
}

// Authentication/admission middleware is shared with OPDS, which uses plain
// text errors. Preserve its status and headers while presenting a JSON API error.
async fn normalize_errors(request: Request, next: Next) -> Response {
    let response = next.run(request).await;
    if !response.status().is_client_error() && !response.status().is_server_error() {
        return response;
    }
    if response
        .headers()
        .get(header::CONTENT_TYPE)
        .is_some_and(|value| value == "application/json")
    {
        return response;
    }
    let (mut parts, body) = response.into_parts();
    drop(to_bytes(body, 16 * 1024).await);
    let code = match parts.status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => LibraryErrorCode::Unauthorized,
        StatusCode::NOT_FOUND => LibraryErrorCode::NotFound,
        StatusCode::TOO_MANY_REQUESTS => LibraryErrorCode::RateLimited,
        StatusCode::SERVICE_UNAVAILABLE => LibraryErrorCode::Unavailable,
        status if status.is_client_error() => LibraryErrorCode::InvalidArgument,
        _ => LibraryErrorCode::Internal,
    };
    let error = LibraryError {
        code,
        message: parts
            .status
            .canonical_reason()
            .unwrap_or("Request failed")
            .into(),
    };
    let bytes = serde_json::to_vec(&error).expect("API error is serializable");
    parts.headers.remove(header::CONTENT_LENGTH);
    parts
        .headers
        .insert(header::CONTENT_TYPE, "application/json".parse().unwrap());
    Response::from_parts(parts, Body::from(bytes))
}

pub(crate) struct RunningApi {
    shutdown: Option<tokio::sync::oneshot::Sender<()>>,
    task: tokio::task::JoinHandle<std::io::Result<()>>,
}
impl RunningApi {
    pub async fn wait(&mut self) -> String {
        match (&mut self.task).await {
            Ok(Ok(())) => "JSON API stopped unexpectedly".into(),
            Ok(Err(error)) => format!("JSON API failed: {error}"),
            Err(error) => format!("JSON API task failed: {error}"),
        }
    }

    pub async fn stop(mut self) {
        if let Some(shutdown) = self.shutdown.take() {
            let _ = shutdown.send(());
        }
        if tokio::time::timeout(std::time::Duration::from_secs(5), &mut self.task)
            .await
            .is_err()
        {
            self.task.abort();
            let _ = (&mut self.task).await;
        }
    }
}
impl Drop for RunningApi {
    fn drop(&mut self) {
        self.task.abort();
    }
}

pub(crate) async fn start(config: &ApiConfig, router: Router) -> Result<RunningApi, String> {
    let listener = tokio::net::TcpListener::bind(config.listen)
        .await
        .map_err(|error| format!("could not bind API {}: {error}", config.listen))?;
    let (shutdown, receiver) = tokio::sync::oneshot::channel();
    let task = tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                let _ = receiver.await;
            })
            .await
    });
    Ok(RunningApi {
        shutdown: Some(shutdown),
        task,
    })
}
