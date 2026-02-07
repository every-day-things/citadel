use serde::{Deserialize, Serialize};
use serde_json::json;
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverBookMetadata {
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub release_year: Option<i32>,
    pub hardcover_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverSearchResult {
    pub title: String,
    pub description: Option<String>,
    pub image_url: Option<String>,
    pub release_year: Option<i32>,
    pub hardcover_id: i32,
    pub authors: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct HardcoverApiStatus {
    pub is_valid: bool,
    pub message: String,
}

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

    // GraphQL query to test the connection - simple query to get user info
    let query = r#"
        query {
            me {
                id
                username
            }
        }
    "#;

    let client = reqwest::Client::new();

    // Handle case where user copied "Bearer <token>" from Hardcover
    let auth_header = if api_key.starts_with("Bearer ") {
        api_key.to_string()
    } else {
        format!("Bearer {}", api_key)
    };

    let response = client
        .post("https://api.hardcover.app/v1/graphql")
        .header("authorization", auth_header)
        .header("content-type", "application/json")
        .json(&json!({
            "query": query
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let status_code = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    log::debug!("Hardcover response status: {}", status_code);
    log::debug!("Hardcover response body: {}", response_text);

    // Check if the response contains errors
    if !status_code.is_success() {
        return Ok(HardcoverApiStatus {
            is_valid: false,
            message: format!("API returned status {}: {}", status_code, response_text),
        });
    }

    // Parse the JSON response to check for GraphQL errors
    let json_response: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {} - Body: {}", e, response_text))?;

    if let Some(errors) = json_response.get("errors") {
        let error_details = serde_json::to_string_pretty(&errors)
            .unwrap_or_else(|_| errors.to_string());
        log::warn!("Hardcover GraphQL errors: {}", error_details);

        let error_message = errors[0]
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown error");
        return Ok(HardcoverApiStatus {
            is_valid: false,
            message: format!("API error: {}", error_message),
        });
    }

    // Check if we got data back
    if json_response.get("data").and_then(|d| d.get("me")).is_some() {
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

    // GraphQL query to search for book by ISBN
    // Use the search API which handles ISBN lookups
    let query = format!(
        r#"
        query {{
            search(query: "{}", query_type: BOOK) {{
                ids
                results
            }}
        }}
        "#,
        isbn
    );

    // Handle case where user copied "Bearer <token>" from Hardcover
    let auth_header = if api_key.starts_with("Bearer ") {
        api_key.to_string()
    } else {
        format!("Bearer {}", api_key)
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.hardcover.app/v1/graphql")
        .header("authorization", auth_header)
        .header("content-type", "application/json")
        .json(&json!({
            "query": query
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    log::debug!("Hardcover ISBN search for '{}': {}", isbn, response_text);

    let json_response: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Check for GraphQL errors
    if let Some(errors) = json_response.get("errors") {
        let error_message = errors[0]
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("API error: {}", error_message));
    }

    // Extract search results
    let search_data = json_response
        .get("data")
        .and_then(|d| d.get("search"))
        .ok_or("No search data in response")?;

    // Get the IDs array
    let ids = search_data
        .get("ids")
        .and_then(|i| i.as_array())
        .ok_or("No IDs in search results")?;

    if ids.is_empty() {
        return Err(format!("No book found with ISBN: {}", isbn));
    }

    // Results is already an object, not a string
    let results = search_data
        .get("results")
        .ok_or("No results in search data")?;

    // Get hits array from results
    let hits = results
        .get("hits")
        .and_then(|h| h.as_array())
        .ok_or("No hits in search results")?;

    if hits.is_empty() {
        return Err(format!("No book found with ISBN: {}", isbn));
    }

    // Get the document from the first hit
    let book = hits[0]
        .get("document")
        .ok_or("No document in search hit")?;

    // ID can be string or number in search results
    let hardcover_id = book
        .get("id")
        .and_then(|i| {
            if let Some(s) = i.as_str() {
                s.parse::<i32>().ok()
            } else {
                i.as_i64().map(|n| n as i32)
            }
        });

    // Image is an object with url field in search results
    let image_url = book
        .get("image")
        .and_then(|img| {
            if let Some(s) = img.as_str() {
                Some(s.to_string())
            } else {
                img.get("url").and_then(|u| u.as_str()).map(|s| s.to_string())
            }
        });

    Ok(HardcoverBookMetadata {
        title: book
            .get("title")
            .and_then(|t| t.as_str())
            .unwrap_or("")
            .to_string(),
        description: book
            .get("description")
            .and_then(|d| d.as_str())
            .map(|s| s.to_string()),
        image_url,
        release_year: book.get("release_year").and_then(|y| y.as_i64()).map(|y| y as i32),
        hardcover_id,
    })
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

    // GraphQL query to search for books
    let graphql_query = format!(
        r#"
        query {{
            search(query: "{}", query_type: BOOK) {{
                ids
                results
            }}
        }}
        "#,
        query.replace('"', "\\\"") // Escape quotes in the query
    );

    // Handle case where user copied "Bearer <token>" from Hardcover
    let auth_header = if api_key.starts_with("Bearer ") {
        api_key.to_string()
    } else {
        format!("Bearer {}", api_key)
    };

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.hardcover.app/v1/graphql")
        .header("authorization", auth_header)
        .header("content-type", "application/json")
        .json(&json!({
            "query": graphql_query
        }))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Hardcover API: {}", e))?;

    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    log::debug!("Hardcover book search for '{}': {}", query, response_text);

    let json_response: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // Check for GraphQL errors
    if let Some(errors) = json_response.get("errors") {
        let error_message = errors[0]
            .get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("API error: {}", error_message));
    }

    // Extract search results
    let search_data = json_response
        .get("data")
        .and_then(|d| d.get("search"))
        .ok_or("No search data in response")?;

    // Get the results object
    let results = search_data
        .get("results")
        .ok_or("No results in search data")?;

    // Get hits array from results
    let hits = results
        .get("hits")
        .and_then(|h| h.as_array())
        .ok_or("No hits in search results")?;

    if hits.is_empty() {
        return Ok(Vec::new()); // Return empty list instead of error
    }

    // Parse all search results
    let mut search_results = Vec::new();
    for hit in hits {
        let book = hit
            .get("document")
            .ok_or("No document in search hit")?;

        // Extract authors from contributions
        let mut authors = Vec::new();
        if let Some(contributions) = book.get("contributions").and_then(|c| c.as_array()) {
            for contribution in contributions {
                if let Some(author_name) = contribution.get("author").and_then(|a| a.get("name")).and_then(|n| n.as_str()) {
                    authors.push(author_name.to_string());
                }
            }
        }

        // ID can be string or number in search results
        let hardcover_id = book
            .get("id")
            .and_then(|i| {
                if let Some(s) = i.as_str() {
                    s.parse::<i32>().ok()
                } else {
                    i.as_i64().map(|n| n as i32)
                }
            })
            .ok_or("Missing or invalid hardcover_id in search result")?;

        // Image is an object with url field in search results
        let image_url = book
            .get("image")
            .and_then(|img| {
                if let Some(s) = img.as_str() {
                    Some(s.to_string())
                } else {
                    img.get("url").and_then(|u| u.as_str()).map(|s| s.to_string())
                }
            });

        search_results.push(HardcoverSearchResult {
            title: book
                .get("title")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string(),
            description: book
                .get("description")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string()),
            image_url,
            release_year: book.get("release_year").and_then(|y| y.as_i64()).map(|y| y as i32),
            hardcover_id,
            authors,
        });
    }

    Ok(search_results)
}
