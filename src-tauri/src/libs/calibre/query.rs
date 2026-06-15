use std::path::Path;

use libcalibre::mime_type::MIMETYPE;
use serde::{Deserialize, Serialize};

use crate::book::{ImportableBookMetadata, LibraryAuthor};
use crate::calibre::book;
use crate::libs::cover_thumbs::{self, CoverThumbnail};
use crate::libs::file_formats;
use crate::{book::LibraryBook, state::CitadelState};

use super::custom_columns::{BookCustomValue, CustomColumnDef, CustomValueDto};
use super::ImportableFile;

#[tauri::command]
#[specta::specta]
pub fn clb_query_search_books(
    state: tauri::State<CitadelState>,
    query: String,
) -> Result<Vec<LibraryBook>, String> {
    let library_root = state
        .get_library_path()
        .ok_or("No library loaded".to_string())?;

    let books = state.with_library(|lib| book::search(library_root, lib, &query))?;
    books.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_cover_thumbnails(
    handle: tauri::AppHandle,
    state: tauri::State<CitadelState>,
) -> Result<Vec<CoverThumbnail>, String> {
    use tauri::Manager;

    let library_root = state
        .get_library_path()
        .ok_or("No library loaded".to_string())?;
    let app_cache_dir = handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("No app cache dir: {}", e))?;

    // The returned URLs are asset-protocol; make sure the scope covers them
    // even if no ensure call has run yet this session.
    handle
        .asset_protocol_scope()
        .allow_directory(app_cache_dir.join("cover-thumbs"), true)
        .map_err(|e| format!("Failed to allow thumbnail dir: {}", e))?;

    Ok(cover_thumbs::list_thumbnails(&app_cache_dir, &library_root))
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Copy, Debug)]
pub enum BookSortOrder {
    TitleAsc,
    TitleDesc,
    AuthorAsc,
    AuthorDesc,
}

impl From<BookSortOrder> for libcalibre::BookSortOrder {
    fn from(sort: BookSortOrder) -> Self {
        match sort {
            BookSortOrder::TitleAsc => libcalibre::BookSortOrder::TitleAsc,
            BookSortOrder::TitleDesc => libcalibre::BookSortOrder::TitleDesc,
            BookSortOrder::AuthorAsc => libcalibre::BookSortOrder::AuthorAsc,
            BookSortOrder::AuthorDesc => libcalibre::BookSortOrder::AuthorDesc,
        }
    }
}

#[derive(Serialize, Deserialize, specta::Type, Clone, Debug)]
pub struct LibraryBookQuery {
    /// Substring match across title, author names, and series names.
    /// `None` or empty text matches all books.
    pub text: Option<String>,
    pub author_id: Option<String>,
    pub series_id: Option<i32>,
    pub hide_read: bool,
    pub sort: BookSortOrder,
    /// Page size. `None` returns all matches.
    pub limit: Option<u32>,
    pub offset: u32,
}

#[derive(Serialize, Deserialize, specta::Type, Clone)]
pub struct LibraryBookPage {
    pub items: Vec<LibraryBook>,
    /// Total number of books matching the filters, ignoring limit/offset.
    pub total: u32,
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_books(
    state: tauri::State<CitadelState>,
    query: LibraryBookQuery,
) -> Result<LibraryBookPage, String> {
    let library_root = state
        .get_library_path()
        .ok_or("No library loaded".to_string())?;

    let author_id = query
        .author_id
        .as_deref()
        .map(|raw| {
            raw.parse::<libcalibre::AuthorId>()
                .map_err(|e| format!("Invalid author id '{raw}': {e}"))
        })
        .transpose()?;

    let book_query = libcalibre::BookQuery {
        text: query.text,
        author_id,
        series_id: query.series_id,
        hide_read: query.hide_read,
        sort: query.sort.into(),
        limit: query.limit.map(i64::from),
        offset: i64::from(query.offset),
    };

    let page = state.with_library(|lib| book::query_page(library_root, lib, book_query))?;
    let (items, total) = page.map_err(|e| e.to_string())?;

    Ok(LibraryBookPage {
        items,
        total: u32::try_from(total).unwrap_or(u32::MAX),
    })
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_get_book(
    state: tauri::State<CitadelState>,
    book_id: String,
) -> Result<LibraryBook, String> {
    let library_root = state
        .get_library_path()
        .ok_or("No library loaded".to_string())?;

    let book_id_int = book_id
        .parse::<i32>()
        .map_err(|e| format!("Invalid book id '{book_id}': {e}"))?;

    let book = state.with_library(|lib| {
        book::get_one(library_root, lib, libcalibre::BookId::from(book_id_int))
    })?;
    book.map_err(|e| e.to_string())
}

/// One series in the library. `id` is what [`LibraryBookQuery::series_id`]
/// filters on; the frontend otherwise only ever sees series names.
#[derive(Serialize, Deserialize, specta::Type, Clone)]
pub struct LibrarySeries {
    pub id: i32,
    pub name: String,
    pub book_count: u32,
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_series(
    state: tauri::State<CitadelState>,
) -> Result<Vec<LibrarySeries>, String> {
    let summaries = state
        .with_library(|lib| lib.list_series())?
        .map_err(|e| e.to_string())?;

    Ok(summaries
        .into_iter()
        .map(|series| LibrarySeries {
            id: series.id,
            name: series.name,
            book_count: u32::try_from(series.book_count).unwrap_or(u32::MAX),
        })
        .collect())
}

/// One tag in the library; `name` is what the tag autocomplete suggests.
#[derive(Serialize, Deserialize, specta::Type, Clone)]
pub struct LibraryTag {
    pub id: i32,
    pub name: String,
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_tags(state: tauri::State<CitadelState>) -> Result<Vec<LibraryTag>, String> {
    let tags = state
        .with_library(|lib| lib.list_tags())?
        .map_err(|e| e.to_string())?;

    Ok(tags
        .into_iter()
        .map(|tag| LibraryTag {
            id: tag.id,
            name: tag.name,
        })
        .collect())
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_authors(
    state: tauri::State<CitadelState>,
) -> Result<Vec<LibraryAuthor>, String> {
    state
        .with_library(|lib| {
            let book_counts = lib.author_book_counts()?;
            lib.authors().map(|author_list| {
                author_list
                    .iter()
                    .map(|author| LibraryAuthor::from_author(author, &book_counts))
                    .collect()
            })
        })
        .and_then(|result| result.map_err(|e| format!("Failed to list authors: {}", e)))
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_is_file_importable(path_to_file: String) -> Option<ImportableFile> {
    let file_path = Path::new(&path_to_file);

    file_formats::validate_file_importable(file_path)
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_importable_file_metadata(file: ImportableFile) -> Option<ImportableBookMetadata> {
    file_formats::get_importable_file_metadata(file)
}
#[tauri::command]
#[specta::specta]
pub fn clb_query_list_all_filetypes() -> Vec<(String, String)> {
    file_formats::SupportedFormats::list_all()
        .iter()
        .filter_map(|(_, extension)| {
            MIMETYPE::from_file_extension(extension)
                .filter(|mimetype| mimetype != &MIMETYPE::UNKNOWN)
                .map(|mimetype| (mimetype.as_str().to_string(), extension.to_string()))
        })
        .collect()
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_list_custom_columns(
    state: tauri::State<CitadelState>,
) -> Result<Vec<CustomColumnDef>, String> {
    state.with_library(|lib| {
        lib.custom_columns()
            .map(|columns| columns.iter().map(CustomColumnDef::from).collect())
            .map_err(|e| e.to_string())
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_get_custom_values_for_book(
    state: tauri::State<CitadelState>,
    book_id: String,
) -> Result<Vec<BookCustomValue>, String> {
    state.with_library(|lib| {
        let book_id_int = book_id.parse::<i32>().map_err(|e| e.to_string())?;
        let values = lib
            .get_custom_values_for_book(libcalibre::BookId::from(book_id_int))
            .map_err(|e| e.to_string())?;

        // Skip values that cannot cross the Tauri boundary (e.g. an i64 out
        // of i32 range) instead of failing the whole command and hiding
        // every other column from the UI.
        let mut book_values = values
            .into_iter()
            .filter_map(|(column_id, value)| {
                CustomValueDto::try_from(value)
                    .map(|value| BookCustomValue { column_id, value })
                    .ok()
            })
            .collect::<Vec<_>>();
        book_values.sort_by_key(|book_value| book_value.column_id);
        Ok(book_values)
    })?
}

#[tauri::command]
#[specta::specta]
pub fn clb_query_is_path_valid_library(library_root: String) -> bool {
    let db_path = libcalibre::util::get_db_path(&library_root);
    db_path.is_some()
}
