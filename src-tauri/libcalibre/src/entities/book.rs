use chrono::NaiveDateTime;

use crate::entities::book_row::BookRow;
use crate::entities::{author::Author, book_file::BookFile};
use crate::models::Identifier;

#[derive(Debug, Clone)]
pub struct Book {
    pub id: i32,
    pub uuid: Option<String>,
    pub title: String,
    pub sortable_title: Option<String>,
    /// Relative path from library root to book directory
    pub path: String,
    pub authors: Vec<Author>,
    pub files: Vec<BookFile>,
    pub identifiers: Vec<Identifier>,
    pub metadata: BookMetadata,
}

#[derive(Debug, Clone)]
pub struct BookMetadata {
    /// A partially HTML-formatted description of the book. User-editable.
    pub description_html: Option<String>,
    pub is_read: bool,
    pub cover_path: Option<String>,
    pub added_date: NaiveDateTime,
}

impl Book {
    pub(crate) fn from_db_parts(
        row: BookRow,
        authors: Vec<Author>,
        files: Vec<BookFile>,
        identifiers: Vec<Identifier>,
        description: Option<String>,
        is_read: bool,
    ) -> Self {
        let metadata = BookMetadata {
            description_html: description,
            is_read,
            cover_path: row.has_cover.and_then(|has_cover| {
                if has_cover {
                    Some(format!("{}/cover.jpg", row.path))
                } else {
                    None
                }
            }),
            added_date: row
                .timestamp
                .unwrap_or_else(|| chrono::Utc::now().naive_utc()),
        };

        Self {
            id: row.id,
            uuid: row.uuid.clone(),
            sortable_title: row.sort.clone(),
            title: row.title.clone(),
            path: row.path,
            authors,
            files,
            identifiers,
            metadata,
        }
    }
}
