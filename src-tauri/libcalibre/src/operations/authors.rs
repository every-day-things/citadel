use diesel::SqliteConnection;

use crate::{
    queries::authors,
    types::AuthorId,
    CalibreError,
};

pub fn remove_author(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<bool, CalibreError> {
    let associated_book_ids = authors::find_books(conn, author_id)?;
    let book_count = associated_book_ids.len();

    if book_count > 0 {
        return Err(CalibreError::AuthorHasAssociatedBooks(associated_book_ids));
    }

    authors::delete(conn, author_id)
}
