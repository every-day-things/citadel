use serde::{Deserialize, Serialize};
use serde_json::json;
use specta::Type;

// ---------------------------------------------------------------------------
// Public return types (unchanged, used by specta for TS bindings)
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverBookMetadata {
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub isbn: Option<String>,
    pub release_year: Option<i32>,
    pub hardcover_id: Option<i32>,
    pub slug: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverSearchResult {
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub isbn: Option<String>,
    pub release_year: Option<i32>,
    pub hardcover_id: i32,
    pub slug: Option<String>,
    pub authors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverApiStatus {
    pub is_valid: bool,
    pub message: String,
}

// ---------------------------------------------------------------------------
// Private GraphQL response types (serde deserialization)
// ---------------------------------------------------------------------------

/// Hardcover returns IDs as either strings or integers.
struct FlexibleId(Option<i32>);

impl<'de> Deserialize<'de> for FlexibleId {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = serde_json::Value::deserialize(deserializer)?;
        let id = match &value {
            serde_json::Value::String(s) => s.parse::<i32>().ok(),
            serde_json::Value::Number(n) => n.as_i64().map(|n| n as i32),
            _ => None,
        };
        Ok(FlexibleId(id))
    }
}

/// Hardcover returns images as either a string URL or `{"url": "..."}`.
struct FlexibleImage(Option<String>);

impl<'de> Deserialize<'de> for FlexibleImage {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = serde_json::Value::deserialize(deserializer)?;
        let url = match &value {
            serde_json::Value::String(s) => Some(s.clone()),
            serde_json::Value::Object(obj) => {
                obj.get("url").and_then(|u| u.as_str()).map(String::from)
            }
            serde_json::Value::Array(items) => items.iter().find_map(|item| {
                item.as_object()
                    .and_then(|obj| obj.get("url"))
                    .and_then(|u| u.as_str())
                    .map(String::from)
            }),
            _ => None,
        };
        Ok(FlexibleImage(url))
    }
}

#[derive(Deserialize)]
struct GqlAuthor {
    name: String,
}

#[derive(Deserialize)]
struct GqlContribution {
    author: GqlAuthor,
}

#[derive(Deserialize)]
struct GqlBookDocument {
    id: FlexibleId,
    title: Option<String>,
    description: Option<String>,
    image: Option<FlexibleImage>,
    #[serde(default)]
    isbns: Vec<String>,
    release_year: Option<i32>,
    slug: Option<String>,
    #[serde(default)]
    contributions: Vec<GqlContribution>,
}

#[derive(Deserialize)]
struct GqlSearchHit {
    document: GqlBookDocument,
}

#[derive(Deserialize)]
struct GqlSearchResults {
    hits: Vec<GqlSearchHit>,
}

#[derive(Deserialize)]
struct GqlSearchData {
    #[allow(dead_code)]
    ids: Vec<serde_json::Value>,
    results: GqlSearchResults,
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const HARDCOVER_API_URL: &str = "https://api.hardcover.app/v1/graphql";

/// Normalize an API key into a Bearer authorization header value.
fn make_auth_header(api_key: &str) -> String {
    if api_key.starts_with("Bearer ") {
        api_key.to_string()
    } else {
        format!("Bearer {}", api_key)
    }
}

/// Build a configured request to the Hardcover GraphQL API.
fn hardcover_request(api_key: &str) -> reqwest::RequestBuilder {
    reqwest::Client::new()
        .post(HARDCOVER_API_URL)
        .header("authorization", make_auth_header(api_key))
        .header("content-type", "application/json")
}

/// Read a GraphQL response: check HTTP status, parse JSON, check for GraphQL
/// errors, and return the `data` field.
async fn execute_graphql(response: reqwest::Response) -> Result<serde_json::Value, String> {
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    log::debug!("Hardcover API: status={}, body_len={}", status, body.len());

    if !status.is_success() {
        return Err(format!("Hardcover API returned status {}", status));
    }

    let json: serde_json::Value =
        serde_json::from_str(&body).map_err(|e| format!("Failed to parse response: {}", e))?;

    if let Some(errors) = json.get("errors") {
        let message = errors
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|e| e.get("message"))
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown error");
        log::warn!("Hardcover GraphQL error: {}", message);
        return Err(format!("API error: {}", message));
    }

    json.get("data")
        .cloned()
        .ok_or_else(|| "No data in GraphQL response".to_string())
}

/// Deserialize the `search` field from GraphQL data into typed search results.
fn parse_search_data(data: &serde_json::Value) -> Result<GqlSearchData, String> {
    let search = data.get("search").ok_or("No search data in response")?;
    serde_json::from_value(search.clone())
        .map_err(|e| format!("Failed to parse search results: {}", e))
}

fn normalize_isbn(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let without_prefix = trimmed
        .strip_prefix("ISBN:")
        .or_else(|| trimmed.strip_prefix("isbn:"))
        .unwrap_or(trimmed)
        .trim();

    let compact: String = without_prefix
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect();
    if compact.is_empty() {
        return None;
    }

    let upper = compact.to_uppercase();
    let valid = upper.len() == 13 && upper.chars().all(|c| c.is_ascii_digit())
        || (upper.len() == 10
            && upper[..9].chars().all(|c| c.is_ascii_digit())
            && upper[9..].chars().all(|c| c.is_ascii_digit() || c == 'X'));
    if valid {
        Some(upper)
    } else {
        None
    }
}

fn pick_preferred_isbn(isbns: &[String]) -> Option<String> {
    let normalized: Vec<String> = isbns
        .iter()
        .filter_map(|isbn| normalize_isbn(isbn))
        .collect();
    normalized
        .iter()
        .find(|isbn| isbn.len() == 13)
        .cloned()
        .or_else(|| normalized.into_iter().next())
}

async fn fetch_hardcover_metadata_by_id_inner(
    api_key: &str,
    hardcover_id: i32,
) -> Result<HardcoverBookMetadata, String> {
    let query = r#"
        query BookById($hardcoverId: Int!) {
            books(where: { id: { _eq: $hardcoverId } }, limit: 1) {
                id
                title
                description
                image
                release_year
                slug
                isbns
            }
        }
    "#;

    let response = hardcover_request(api_key)
        .json(&json!({ "query": query, "variables": { "hardcoverId": hardcover_id } }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let data = execute_graphql(response).await?;
    let books = data
        .get("books")
        .and_then(|v| v.as_array())
        .ok_or("No books data in response")?;
    let first = books.first().ok_or("No book found for Hardcover ID")?;
    let doc: GqlBookDocument = serde_json::from_value(first.clone())
        .map_err(|e| format!("Failed to parse book: {}", e))?;

    Ok(HardcoverBookMetadata {
        title: doc.title.unwrap_or_default(),
        description: doc.description,
        image_url: doc.image.and_then(|i| i.0),
        isbn: pick_preferred_isbn(&doc.isbns),
        release_year: doc.release_year,
        hardcover_id: doc.id.0,
        slug: doc.slug,
    })
}

// ---------------------------------------------------------------------------
// Public Tauri commands
// ---------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn test_hardcover_connection(api_key: String) -> Result<HardcoverApiStatus, String> {
    let api_key = api_key.trim();

    if api_key.is_empty() {
        return Ok(HardcoverApiStatus {
            is_valid: false,
            message: "API key is empty".to_string(),
        });
    }

    let query = r#"query { me { id username } }"#;

    let response = hardcover_request(api_key)
        .json(&json!({ "query": query }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    match execute_graphql(response).await {
        Ok(data) => {
            if data.get("me").is_some() {
                Ok(HardcoverApiStatus {
                    is_valid: true,
                    message: "Connection successful".to_string(),
                })
            } else {
                Ok(HardcoverApiStatus {
                    is_valid: false,
                    message: "Invalid API response format".to_string(),
                })
            }
        }
        Err(e) => Ok(HardcoverApiStatus {
            is_valid: false,
            message: e,
        }),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_hardcover_metadata_by_isbn(
    api_key: String,
    isbn: String,
) -> Result<HardcoverBookMetadata, String> {
    let api_key = api_key.trim();
    let isbn = isbn.trim();

    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }
    if isbn.is_empty() {
        return Err("ISBN is empty".to_string());
    }

    let query = r#"
        query SearchByIsbn($isbn: String!) {
            search(query: $isbn, query_type: BOOK) { ids results }
        }
    "#;

    let response = hardcover_request(api_key)
        .json(&json!({ "query": query, "variables": { "isbn": isbn } }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let data = execute_graphql(response).await?;
    let search = parse_search_data(&data)?;

    let hit = search
        .results
        .hits
        .first()
        .ok_or_else(|| format!("No book found with ISBN: {}", isbn))?;
    let doc = &hit.document;

    Ok(HardcoverBookMetadata {
        title: doc.title.clone().unwrap_or_default(),
        description: doc.description.clone(),
        image_url: doc.image.as_ref().and_then(|i| i.0.clone()),
        isbn: pick_preferred_isbn(&doc.isbns).or_else(|| normalize_isbn(isbn)),
        release_year: doc.release_year,
        hardcover_id: doc.id.0,
        slug: doc.slug.clone(),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_hardcover_metadata_by_book_id(
    api_key: String,
    hardcover_id: i32,
) -> Result<HardcoverBookMetadata, String> {
    let api_key = api_key.trim();
    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }
    if hardcover_id <= 0 {
        return Err("Hardcover ID must be positive".to_string());
    }

    fetch_hardcover_metadata_by_id_inner(api_key, hardcover_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn search_hardcover_books(
    api_key: String,
    query: String,
) -> Result<Vec<HardcoverSearchResult>, String> {
    let api_key = api_key.trim();
    let query = query.trim();

    if api_key.is_empty() {
        return Err("API key is empty".to_string());
    }
    if query.is_empty() {
        return Err("Search query is empty".to_string());
    }

    let graphql_query = r#"
        query SearchBooks($query: String!) {
            search(query: $query, query_type: BOOK) { ids results }
        }
    "#;

    let response = hardcover_request(api_key)
        .json(&json!({ "query": graphql_query, "variables": { "query": query } }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let data = execute_graphql(response).await?;
    let search = parse_search_data(&data)?;

    search
        .results
        .hits
        .iter()
        .map(|hit| {
            let doc = &hit.document;
            Ok(HardcoverSearchResult {
                title: doc.title.clone().unwrap_or_default(),
                description: doc.description.clone(),
                image_url: doc.image.as_ref().and_then(|i| i.0.clone()),
                isbn: pick_preferred_isbn(&doc.isbns),
                release_year: doc.release_year,
                hardcover_id: doc
                    .id
                    .0
                    .ok_or("Missing or invalid hardcover_id in search result")?,
                slug: doc.slug.clone(),
                authors: doc
                    .contributions
                    .iter()
                    .map(|c| c.author.name.clone())
                    .collect(),
            })
        })
        .collect()
}
