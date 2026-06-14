use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

use libcalibre::{AuthorId, Library};

use crate::{
    book::{LibraryBook, LocalOrRemote, LocalOrRemoteUrl},
    libs::util,
};

/// Generate a LocalOrRemoteUrl for the cover image of a book.
///
/// Trusts the `has_cover` flag from the books table (Calibre keeps it
/// accurate, and our own cover writes — `Library::set_book_cover` and
/// `Library::add_book` — set it alongside writing cover.jpg) instead of
/// statting cover.jpg per book: at 5k books the per-book
/// `PathBuf::exists` dominated the (since-retired) whole-library list
/// command (~90% of 340ms).
/// If the flag is stale (file deleted behind Calibre's back) the URL
/// dangles and the frontend's cover `onerror` fallback takes over.
fn book_cover_image(
    library_root: &str,
    book: &libcalibre::library::Book,
    cache_bust: bool,
) -> Option<LocalOrRemoteUrl> {
    if !book.has_cover {
        return None;
    }

    let cover_relative_path = format!("{}/cover.jpg", &book.book_dir_path);
    let cover_image_path = PathBuf::from(library_root).join(&cover_relative_path);
    let mut url = util::path_to_asset_url(&cover_image_path);

    // The cover path is stable (`…/cover.jpg`), so the webview caches it by URL
    // and keeps showing a replaced cover (e.g. after a metadata lookup). Tag the
    // URL with the cover's mtime so it re-fetches. Only the single-book path does
    // this — the list paths stay stat-free, which matters at thousands of books
    // (and the grid already cache-busts via per-mtime thumbnail file names).
    if cache_bust {
        if let Some(mtime_ms) = cover_mtime_ms(&cover_image_path) {
            url = format!("{url}?v={mtime_ms}");
        }
    }

    Some(LocalOrRemoteUrl {
        kind: LocalOrRemote::Local,
        local_path: Some(cover_image_path),
        url,
    })
}

/// The cover file's modification time in epoch milliseconds, used as a
/// cache-busting token. `None` if the file is missing or unreadable.
fn cover_mtime_ms(path: &Path) -> Option<i64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let since = modified.duration_since(UNIX_EPOCH).ok()?;
    Some(since.as_millis() as i64)
}

fn to_library_book(
    library_root: &str,
    book: &libcalibre::library::Book,
    author_book_counts: &HashMap<AuthorId, i64>,
    cache_bust_cover: bool,
) -> LibraryBook {
    let mut library_book = LibraryBook::from_library_book(book, library_root, author_book_counts);
    library_book.cover_image = book_cover_image(library_root, book, cache_bust_cover);
    library_book
}

/// One book, hydrated exactly like a `query_page` item (authors, tags,
/// series, identifiers, files, read state, cover URL, author book counts).
pub fn get_one(
    library_root: String,
    lib: &mut Library,
    book_id: libcalibre::BookId,
) -> Result<LibraryBook, libcalibre::CalibreError> {
    let book = lib.get_book(book_id)?;
    let author_book_counts = lib.author_book_counts()?;
    // Single book (e.g. the Edit page): cache-bust the cover so a freshly
    // applied cover is shown instead of the webview's cached copy.
    Ok(to_library_book(
        &library_root,
        &book,
        &author_book_counts,
        true,
    ))
}

pub fn search(
    library_root: String,
    lib: &mut Library,
    query: &str,
) -> Result<Vec<LibraryBook>, libcalibre::CalibreError> {
    let results = lib.search_books(query)?;
    let author_book_counts = lib.author_book_counts()?;

    Ok(results
        .iter()
        .map(|book| to_library_book(&library_root, book, &author_book_counts, false))
        .collect())
}

pub fn query_page(
    library_root: String,
    lib: &mut Library,
    query: libcalibre::BookQuery,
) -> Result<(Vec<LibraryBook>, i64), libcalibre::CalibreError> {
    let page = lib.query_books(query)?;
    let author_book_counts = lib.author_book_counts()?;

    Ok((
        page.items
            .iter()
            .map(|book| to_library_book(&library_root, book, &author_book_counts, false))
            .collect(),
        page.total,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_book(has_cover: bool) -> libcalibre::library::Book {
        libcalibre::library::Book {
            id: libcalibre::BookId::from(1),
            uuid: "test-uuid".to_string(),
            title: "Title".to_string(),
            sortable_title: None,
            authors: vec![],
            tags: vec![],
            series: None,
            series_index: None,
            description: None,
            identifiers: vec![],
            has_cover,
            is_read: false,
            files: vec![],
            created_at: chrono::DateTime::UNIX_EPOCH.naive_utc(),
            updated_at: chrono::DateTime::UNIX_EPOCH.naive_utc(),
            book_dir_path: "Author/Title (1)".to_string(),
        }
    }

    #[test]
    fn no_cover_flag_yields_no_cover_url() {
        assert!(book_cover_image("/library", &test_book(false), false).is_none());
    }

    /// `has_cover` is trusted without statting cover.jpg (the per-book
    /// `PathBuf::exists` dominated list-all at 5k books). A stale flag
    /// yields a dangling URL, which the frontend's onerror fallback absorbs.
    #[test]
    fn has_cover_flag_trusted_without_filesystem_check() {
        // cache_bust=true also exercises the graceful path when the cover file
        // is absent: no mtime, so the URL is returned without a `?v=` token.
        let cover = book_cover_image("/definitely/not/a/real/library", &test_book(true), true)
            .expect("has_cover implies a cover URL");
        assert!(matches!(cover.kind, LocalOrRemote::Local));
        let path = cover.local_path.expect("local cover keeps its path");
        assert!(path.ends_with("cover.jpg"));
        assert!(!path.exists());
        assert!(cover.url.contains("cover.jpg"));
    }
}
