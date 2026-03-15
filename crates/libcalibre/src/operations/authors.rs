use diesel::SqliteConnection;

use crate::{
    entities::author::{NewAuthor, UpdateAuthorData},
    library::AuthorAdd,
    queries::authors,
    types::AuthorId,
    CalibreError,
};

pub fn all(conn: &mut SqliteConnection) -> Result<Vec<crate::library::Author>, CalibreError> {
    let author_rows = authors::all(conn)?;

    let author_list = author_rows
        .into_iter()
        .map(|author_row| crate::library::Author {
            id: AuthorId(author_row.id),
            name: author_row.name,
            sort: author_row.sort.unwrap_or_default(),
            link: if author_row.link.is_empty() {
                None
            } else {
                Some(author_row.link)
            },
        })
        .collect::<Vec<crate::library::Author>>();

    Ok(author_list)
}

pub fn update(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
    update: crate::library::AuthorUpdate,
) -> Result<crate::library::Author, CalibreError> {
    // TODO: Do we need to go update the sort name on each book this author
    // is associated with?

    let update_data = UpdateAuthorData {
        name: update.name,
        sort: update.sort,
        link: update.link,
    };

    let updated_author = authors::update(conn, author_id, update_data)?;

    Ok(crate::library::Author {
        id: AuthorId(updated_author.id),
        name: updated_author.name,
        sort: updated_author.sort.unwrap_or_default(),
        link: if updated_author.link.is_empty() {
            None
        } else {
            Some(updated_author.link)
        },
    })
}

pub fn remove(conn: &mut SqliteConnection, author_id: AuthorId) -> Result<(), CalibreError> {
    let associated_book_ids = authors::find_books(conn, author_id)?;
    let book_count = associated_book_ids.len();

    if book_count > 0 {
        return Err(CalibreError::AuthorHasAssociatedBooks(associated_book_ids));
    }

    authors::delete(conn, author_id)
}

pub fn add(
    conn: &mut SqliteConnection,
    author: AuthorAdd,
) -> Result<crate::library::Author, CalibreError> {
    let new_author = NewAuthor {
        name: author.name,
        sort: author.sort,
        link: author.link,
    };

    let created_author = crate::queries::authors::create(conn, new_author)?;

    Ok(crate::library::Author {
        id: AuthorId(created_author.id),
        name: created_author.name,
        sort: created_author.sort.unwrap_or_default(),
        link: if created_author.link.is_empty() {
            None
        } else {
            Some(created_author.link)
        },
    })
}

pub fn get(
    conn: &mut SqliteConnection,
    author_id: AuthorId,
) -> Result<crate::library::Author, CalibreError> {
    let author_row = crate::queries::authors::get(conn, author_id)?;

    if let Some(author) = author_row {
        Ok(crate::library::Author {
            id: AuthorId(author.id),
            name: author.name,
            sort: author.sort.unwrap_or_default(),
            link: if author.link.is_empty() {
                None
            } else {
                Some(author.link)
            },
        })
    } else {
        Err(CalibreError::AuthorNotFound(author_id))
    }
}
