use std::path::PathBuf;

use libcalibre::Library;

use crate::{
    book::{LibraryBook, LocalOrRemote, LocalOrRemoteUrl},
    libs::util,
};

/// Generate a LocalOrRemoteUrl for the cover image of a book, if the file exists
/// on disk.
fn book_cover_image(
    library_root: &str,
    book: &libcalibre::library::Book,
) -> Option<LocalOrRemoteUrl> {
    if !book.has_cover {
        return None;
    }

    let cover_relative_path = format!("{}/cover.jpg", &book.book_dir_path);
    let cover_image_path = PathBuf::from(library_root).join(&cover_relative_path);

    if cover_image_path.exists() {
        let url = util::path_to_asset_url(&cover_image_path);

        Some(LocalOrRemoteUrl {
            kind: LocalOrRemote::Local,
            local_path: Some(cover_image_path),
            url,
        })
    } else {
        None
    }
}

fn to_library_book(library_root: &str, book: &libcalibre::library::Book) -> LibraryBook {
    let mut library_book = LibraryBook::from_library_book(book, library_root);
    library_book.cover_image = book_cover_image(library_root, book);
    library_book
}

pub fn list_all(
    library_root: String,
    lib: &mut Library,
) -> Result<Vec<LibraryBook>, libcalibre::CalibreError> {
    let results = lib.books()?;

    Ok(results
        .iter()
        .map(|book| to_library_book(&library_root, book))
        .collect())
}

pub fn search(
    library_root: String,
    lib: &mut Library,
    query: &str,
) -> Result<Vec<LibraryBook>, libcalibre::CalibreError> {
    let results = lib.search_books(query)?;

    Ok(results
        .iter()
        .map(|book| to_library_book(&library_root, book))
        .collect())
}

pub fn query_page(
    library_root: String,
    lib: &mut Library,
    query: libcalibre::BookQuery,
) -> Result<(Vec<LibraryBook>, i64), libcalibre::CalibreError> {
    let page = lib.query_books(query)?;

    Ok((
        page.items
            .iter()
            .map(|book| to_library_book(&library_root, book))
            .collect(),
        page.total,
    ))
}
