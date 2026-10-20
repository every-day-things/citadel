//! Shared limits for requests and blocking work across every service listener.
use std::{sync::Arc, time::Duration};

use axum::{
    body::{to_bytes, Body},
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use futures_util::StreamExt;
use tokio::sync::Semaphore;

const BODY_BYTES: usize = 16 * 1024;
const CAPACITY: usize = 64;

#[derive(Clone)]
pub(crate) struct Limits {
    requests: Arc<Semaphore>,
    work: Arc<Semaphore>,
    deadline: Duration,
}

pub(crate) struct WorkUnavailable;
impl IntoResponse for WorkUnavailable {
    fn into_response(self) -> Response {
        busy()
    }
}

impl Default for Limits {
    fn default() -> Self {
        Self::new(CAPACITY, Duration::from_secs(30))
    }
}

impl Limits {
    fn new(capacity: usize, deadline: Duration) -> Self {
        Self {
            requests: Arc::new(Semaphore::new(capacity)),
            work: Arc::new(Semaphore::new(capacity)),
            deadline,
        }
    }
    pub(crate) fn work_permit(&self) -> Result<tokio::sync::OwnedSemaphorePermit, WorkUnavailable> {
        self.work
            .clone()
            .try_acquire_owned()
            .map_err(|_| WorkUnavailable)
    }
}

pub(crate) fn busy() -> Response {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        [(header::RETRY_AFTER, "1")],
        "Catalog busy",
    )
        .into_response()
}

pub(crate) async fn run_work<T: Send + 'static>(
    limits: &Limits,
    operation: impl FnOnce() -> T + Send + 'static,
) -> Result<T, WorkUnavailable> {
    let permit = limits.work_permit()?;
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        operation()
    })
    .await
    .map_err(|_| WorkUnavailable)
}

pub(crate) async fn enforce(
    State(limits): State<Limits>,
    request: Request,
    next: Next,
) -> Response {
    let permit = match limits.requests.clone().try_acquire_owned() {
        Ok(permit) => permit,
        Err(_) => return busy(),
    };
    let feed = !request.uri().path().starts_with("/opds/books/");
    let (parts, body) = request.into_parts();
    // Consume even chunked bodies under a deadline; GET handlers ignore their content.
    match tokio::time::timeout(limits.deadline, to_bytes(body, BODY_BYTES)).await {
        Ok(Ok(_)) => {}
        Ok(Err(_)) => return StatusCode::PAYLOAD_TOO_LARGE.into_response(),
        Err(_) => return busy(),
    }
    let request = Request::from_parts(parts, Body::empty());
    let response = if feed {
        match tokio::time::timeout(limits.deadline, next.run(request)).await {
            Ok(response) => response,
            Err(_) => return busy(),
        }
    } else {
        next.run(request).await
    };
    let (parts, body) = response.into_parts();
    // Keep admission occupied until the client consumes or drops the response body.
    let stream = futures_util::stream::unfold(
        (body.into_data_stream(), permit),
        |(mut body, permit)| async move { body.next().await.map(|chunk| (chunk, (body, permit))) },
    );
    Response::from_parts(parts, Body::from_stream(stream))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{routing::get, Router};
    use tower::ServiceExt;

    fn app(limits: Limits) -> Router {
        Router::new()
            .route("/opds", get(|| async { "feed" }))
            .layer(axum::middleware::from_fn_with_state(limits, enforce))
    }

    #[tokio::test]
    async fn response_body_holds_shared_admission_until_dropped() {
        let limits = Limits::new(1, Duration::from_secs(1));
        let first = app(limits.clone())
            .oneshot(Request::builder().uri("/opds").body(Body::empty()).unwrap())
            .await
            .unwrap();
        let response = app(limits.clone())
            .oneshot(Request::builder().uri("/opds").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
        assert_eq!(response.headers()[header::RETRY_AFTER], "1");
        drop(first);
        assert_eq!(limits.requests.available_permits(), 1);
    }

    #[tokio::test]
    async fn body_limit_covers_declared_and_chunked_bodies() {
        for declared in [false, true] {
            let mut request = Request::builder().uri("/opds");
            if declared {
                request = request.header(header::CONTENT_LENGTH, BODY_BYTES + 1);
            }
            let chunks = futures_util::stream::iter([
                Ok::<_, std::io::Error>(vec![b'x'; BODY_BYTES]),
                Ok(vec![b'x']),
            ]);
            let response = app(Limits::default())
                .oneshot(request.body(Body::from_stream(chunks)).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
        }
    }

    #[tokio::test]
    async fn timed_out_blocking_job_retains_its_work_slot() {
        let limits = Limits::new(1, Duration::from_millis(5));
        let (started_tx, started_rx) = tokio::sync::oneshot::channel();
        let (release_tx, release_rx) = std::sync::mpsc::channel();
        let copy = limits.clone();
        let task = tokio::spawn(async move {
            run_work(&copy, move || {
                started_tx.send(()).unwrap();
                release_rx.recv().unwrap();
            })
            .await
        });
        started_rx.await.unwrap();
        task.abort();
        let _ = task.await;
        assert!(run_work(&limits, || ()).await.is_err());
        release_tx.send(()).unwrap();
        tokio::time::timeout(Duration::from_secs(1), async {
            while limits.work.available_permits() == 0 {
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
        assert!(run_work(&limits, || ()).await.is_ok());
    }
    #[tokio::test]
    async fn feed_deadline_does_not_cut_off_slow_successful_downloads() {
        let limits = Limits::new(2, Duration::from_millis(5));
        let router = Router::new()
            .route(
                "/opds",
                get(|| async {
                    tokio::time::sleep(Duration::from_millis(50)).await;
                    "feed"
                }),
            )
            .route(
                "/opds/books/1/cover",
                get(|| async {
                    tokio::time::sleep(Duration::from_millis(50)).await;
                    "cover-bytes"
                }),
            )
            .layer(axum::middleware::from_fn_with_state(limits, enforce));
        let feed = router
            .clone()
            .oneshot(Request::builder().uri("/opds").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(feed.status(), StatusCode::SERVICE_UNAVAILABLE);
        let asset = router
            .oneshot(
                Request::builder()
                    .uri("/opds/books/1/cover")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(asset.status(), StatusCode::OK);
        assert_eq!(
            to_bytes(asset.into_body(), 100).await.unwrap(),
            "cover-bytes"
        );
    }
}
