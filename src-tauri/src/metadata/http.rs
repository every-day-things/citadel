use std::time::Duration;

/// A descriptive User-Agent so library SRU operators can identify the client.
const USER_AGENT: &str = concat!("Citadel/", env!("CARGO_PKG_VERSION"), " (+metadata-lookup)");

fn client(timeout_ms: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_millis(timeout_ms))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))
}

/// GET a URL and return its body as text, mapping transport, timeout, and
/// non-2xx responses to a descriptive error. Timeouts get a distinct message
/// so the UI can suggest trying another source.
pub async fn get_text(url: &str, timeout_ms: u64) -> Result<String, String> {
    let response = client(timeout_ms)?.get(url).send().await.map_err(|e| {
        if e.is_timeout() {
            "The source timed out — try another source.".to_string()
        } else {
            format!("Failed to reach source: {e}")
        }
    })?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Source returned status {status}"));
    }

    response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))
}

/// GET a URL and decode its body as JSON into `T`.
pub async fn get_json<T: serde::de::DeserializeOwned>(
    url: &str,
    timeout_ms: u64,
) -> Result<T, String> {
    let response = client(timeout_ms)?.get(url).send().await.map_err(|e| {
        if e.is_timeout() {
            "The source timed out — try another source.".to_string()
        } else {
            format!("Failed to reach source: {e}")
        }
    })?;

    let status = response.status();
    if !status.is_success() {
        return Err(format!("Source returned status {status}"));
    }

    response
        .json::<T>()
        .await
        .map_err(|e| format!("Failed to parse response: {e}"))
}
