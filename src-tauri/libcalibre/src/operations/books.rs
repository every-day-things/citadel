use std::collections::HashMap;

use chrono::NaiveDateTime;
use diesel::{Connection, SqliteConnection};

use crate::{
    library::{Book, BookUpdate},
    queries::{authors, book_descriptions, book_files, book_identifiers, books},
    types::{AuthorId, BookId},
    CalibreError, UpdateBookData,
};

pub fn update_book(
    conn: &mut SqliteConnection,
    book_id: BookId,
    update: BookUpdate,
) -> Result<(), CalibreError> {
    if update.author_names.is_some() && update.author_ids.is_some() {
        // TODO: Encode this in the struct
        return Err(CalibreError::BannedFunctionInvocation(
            "Cannot provide both author_names and author_ids".to_string(),
        ));
    }

    conn.transaction::<(), CalibreError, _>(|conn| {
        let book_update = UpdateBookData {
            title: update.title,
            pubdate: update.publication_date.map(|d| NaiveDateTime::from(d)),
            series_index: update.series_index,

            author_sort: None, // Managed via trigger
            flags: None,       // Not implemented yet
            has_cover: None,   // Not implemented yet

            timestamp: None, // Never update created at timestamp
            path: None,      // Cannot be updated here
        };

        books::update(conn, book_id, book_update)?;

        if let Some(description) = update.description {
            book_descriptions::update(conn, book_id, description)?;
        }

        if let Some(author_names) = update.author_names {
            let existing = books::find_authors(conn, book_id)?;
            let existing_authors = authors::get_many(conn, existing)?
                .into_iter()
                .collect::<Vec<_>>();

            let to_unlink: Vec<AuthorId> = existing_authors
                .iter()
                .filter(|a| !author_names.contains(&a.name))
                .map(|a| AuthorId(a.id))
                .collect();

            for author_id in to_unlink {
                authors::unlink_book(conn, author_id, book_id)?;
            }

            let to_link: Vec<String> = author_names
                .iter()
                .filter(|name| !existing_authors.iter().any(|a| &a.name == *name))
                .cloned()
                .collect();

            for author_name in to_link {
                let author = authors::create_if_not_exists(conn, author_name.as_str())?;

                authors::link_book(conn, AuthorId(author.id), book_id)?;
            }
        }

        if let Some(author_ids) = update.author_ids {
            let existing = books::find_authors(conn, book_id)?;
            let existing_authors = authors::get_many(conn, existing)?
                .into_iter()
                .collect::<Vec<_>>();

            let to_unlink: Vec<AuthorId> = existing_authors
                .iter()
                .filter(|a| !author_ids.contains(&AuthorId(a.id)))
                .map(|a| AuthorId(a.id))
                .collect();

            for author_id in to_unlink {
                authors::unlink_book(conn, author_id, book_id)?;
            }

            let to_link: Vec<AuthorId> = author_ids
                .iter()
                .filter(|id| !existing_authors.iter().any(|a| &AuthorId(a.id) == *id))
                .cloned()
                .collect();

            for author_id in to_link {
                authors::link_book(conn, author_id, book_id)?;
            }
        }

        Ok(())
    })
}

pub fn get_book(conn: &mut SqliteConnection, book_id: BookId) -> Result<Book, CalibreError> {
    let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;
    let book_desc = book_descriptions::get(conn, book_id)?;
    let author_ids = books::find_authors(conn, book_id)?;
    let author_models = authors::get_many(conn, author_ids)?;
    let identifer_models = book_identifiers::get(conn, book_id)?;

    let authors: Vec<crate::library::Author> = author_models
        .into_iter()
        .map(|a| crate::library::Author {
            id: AuthorId(a.id),
            name: a.name,
            sort: a.sort.unwrap_or_default(),
            link: if a.link.is_empty() {
                None
            } else {
                Some(a.link)
            },
        })
        .collect();

    let identifiers: HashMap<String, String> = identifer_models
        .into_iter()
        .map(|id| (id.type_, id.val))
        .collect();

    let files = book_files::find_by_book_id(conn, book_id)?;
    let file_formats = files.into_iter().map(|f| f.format).collect::<Vec<String>>();

    Ok(Book {
        id: BookId(book.id),
        uuid: book.uuid.ok_or(CalibreError::DatabaseIntegrity(
            "Book missing required UUID".to_string(),
        ))?,
        title: book.title,
        authors,
        identifiers,
        description: book_desc,
        has_cover: book.has_cover.unwrap_or(false),
        file_formats,
        created_at: book.timestamp.unwrap_or_else(|| NaiveDateTime::UNIX_EPOCH),
        updated_at: book.last_modified,
        book_dir_path: book.path,
    })
}

pub fn all(conn: &mut SqliteConnection) -> Result<Vec<Book>, CalibreError> {
    let book_rows = books::all(conn)?;
    let book_ids = book_rows
        .iter()
        .map(|b| BookId(b.id))
        .collect::<Vec<BookId>>();

    let author_ids_by_book = authors::find_author_ids_by_book_ids(conn, book_ids.clone())?;
    let book_descriptions = book_descriptions::find_many_by_book_ids(conn, book_ids.clone())?;
    let identifiers = book_identifiers::find_many_by_book_ids(conn, book_ids.clone())?;
    let book_files = book_files::find_many_by_book_ids(conn, book_ids)?;

    let unique_author_ids: Vec<AuthorId> = author_ids_by_book
        .values()
        .flatten()
        .cloned()
        .collect::<std::collections::HashSet<AuthorId>>()
        .into_iter()
        .collect();

    let authors_by_id = get_authors(conn, unique_author_ids)?;

    // Assemble books from fetched data
    let mut book_list = Vec::with_capacity(book_rows.len());

    for book_row in book_rows {
        let book_id = BookId(book_row.id);

        let book_authors = match author_ids_by_book.get(&book_id) {
            Some(author_ids) => author_ids
                .iter()
                .filter_map(|author_id| {
                    match authors_by_id.get(author_id) {
                        Some(author) => Some(author.clone()),
                        None => {
                            // TODO: Have a better story around logging
                            eprintln!(
                                "WARNING: Book {} references missing author {}",
                                book_id, author_id
                            );
                            None
                        }
                    }
                })
                .collect(),
            None => Vec::new(),
        };

        let book_description = book_descriptions.get(&book_id).cloned();
        let book_files = book_files.get(&book_id).cloned().unwrap_or_default();

        let book_identifiers = identifiers
            .get(&book_id)
            .map(|ids| {
                ids.iter()
                    .map(|id| (id.type_.clone(), id.val.clone()))
                    .collect::<HashMap<String, String>>()
            })
            .unwrap_or_default();

        let file_formats = book_files
            .iter()
            .map(|f| f.format.clone())
            .collect::<Vec<String>>();

        let book_model = Book {
            id: book_id,
            uuid: book_row.uuid.ok_or(CalibreError::DatabaseIntegrity(
                "Book missing required UUID".to_string(),
            ))?,
            title: book_row.title,
            authors: book_authors,
            identifiers: book_identifiers,
            description: book_description,
            has_cover: book_row.has_cover.unwrap_or(false),
            file_formats,
            created_at: book_row
                .timestamp
                .unwrap_or_else(|| NaiveDateTime::UNIX_EPOCH),
            updated_at: book_row.last_modified,
            book_dir_path: book_row.path,
        };

        book_list.push(book_model);
    }

    Ok(book_list)
}

fn get_authors(
    conn: &mut SqliteConnection,
    author_ids: Vec<AuthorId>,
) -> Result<HashMap<AuthorId, crate::library::Author>, CalibreError> {
    let authors = authors::get_many(conn, author_ids)?;

    let mapping = authors
        .into_iter()
        .map(|a| {
            (
                AuthorId(a.id),
                crate::library::Author {
                    id: AuthorId(a.id),
                    name: a.name,
                    sort: a.sort.unwrap_or_default(),
                    link: if a.link.is_empty() {
                        None
                    } else {
                        Some(a.link)
                    },
                },
            )
        })
        .collect::<HashMap<AuthorId, crate::library::Author>>();

    Ok(mapping)
}
