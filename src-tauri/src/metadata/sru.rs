use crate::metadata::model::{isbn_equivalent, BookMetadata};
use crate::metadata::source::SruEndpoint;
use crate::metadata::{http, marcxml};

/// Search an SRU endpoint. When `isbn` is given the CQL targets the endpoint's
/// ISBN index and the results are filtered to records whose `020$a` actually
/// matches (SRU matching is fuzzy); otherwise it is a quoted title/keyword
/// search.
pub async fn search(
    ep: &SruEndpoint,
    query: &str,
    isbn: Option<&str>,
) -> Result<Vec<BookMetadata>, String> {
    let cql = match isbn {
        Some(i) => format!("{}={}", ep.isbn_index, i),
        None => format!("{}=\"{}\"", ep.title_index, query),
    };

    let url = format!(
        "{base}?version={version}&operation=searchRetrieve&query={query}&recordSchema={schema}&maximumRecords={max}",
        base = ep.base_url,
        version = ep.version,
        query = urlencoding::encode(&cql),
        schema = ep.record_schema,
        max = ep.max_records,
    );

    let body = http::get_text(&url, ep.timeout_ms).await?;
    let mut records = marcxml::parse_envelope(&body, ep.provider)?;

    if let Some(want) = isbn {
        records.retain(|record| {
            record
                .isbn
                .as_deref()
                .is_some_and(|got| isbn_equivalent(got, want))
        });
    }

    Ok(records)
}
