use std::path::PathBuf;

use libcalibre::calibre_client::CalibreClient;

use crate::{
    book::{LibraryBook, LocalOrRemote, LocalOrRemoteUrl},
    libs::util,
};

/// Generate a LocalOrRemoteUrl for the cover image of a book, if the file exists
/// on disk.
fn book_cover_image(library_root: &String, book: &libcalibre::Book) -> Option<LocalOrRemoteUrl> {
    let cover_relative_path = book.metadata.cover_path.as_ref()?;
    let cover_image_path = PathBuf::from(library_root).join(cover_relative_path);

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

pub fn list_all(library_root: String, calibre: &mut CalibreClient) -> Vec<LibraryBook> {
    let results = calibre.find_all().expect("Could not load books from DB");

    results
        .iter()
        .map(|book| {
            let mut library_book = LibraryBook::from_book(book, &library_root);
            library_book.cover_image = book_cover_image(&library_root, book);

            library_book
        })
        .collect()
}
