use diesel::{Connection, SqliteConnection};

use crate::{
    assets::{self, COVER_FILENAME},
    queries::{authors, book_descriptions, book_files, book_identifiers, books},
    types::BookId,
    CalibreError,
};

pub fn get_book_cover(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
) -> Result<Vec<u8>, CalibreError> {
    let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;
    let file_path = assets::asset_path(library_root, &book.path, COVER_FILENAME);

    assets::read(&file_path)
}

pub fn get_book_file_path(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: &str,
) -> Result<std::path::PathBuf, CalibreError> {
    let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;
    let file = book_files::find_by_book_and_format(conn, book_id, file_format.to_string())?;

    match file {
        Some(_) => {
            let book_filename = filename(book.path.clone(), file_format.to_string());
            let file_path = assets::asset_path(library_root, &book.path, &book_filename);
            Ok(file_path)
        }
        None => {
            return Err(CalibreError::BookFileNotFound(
                book_id,
                file_format.to_string(),
            ))
        }
    }
}

pub fn get_book_file(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: &str,
) -> Result<Vec<u8>, CalibreError> {
    let file_path = get_book_file_path(library_root, conn, book_id, file_format)?;
    return assets::read(&file_path);
}

pub fn add_book_file_from_bytes(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: String,
    data: Vec<u8>,
) -> Result<(), CalibreError> {
    let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;

    let book_filename = filename(book.path.clone(), file_format.clone());
    let file_path = assets::asset_path(library_root, &book.path, &book_filename);
    assets::write(&file_path, &data)?;

    let new_file = crate::entities::book_file::NewBookFile {
        book: book_id.as_i32(),
        format: file_format.to_uppercase(),
        uncompressed_size: data.len() as i32,
        name: book.path.clone(),
    };

    match book_files::create(conn, new_file) {
        Ok(_) => Ok(()),
        Err(e) => {
            // If database entry fails, remove the written file
            let _ = std::fs::remove_file(&file_path);
            Err(e)
        }
    }
}

pub fn add_book_file_from_path(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: String,
    file_path: String,
) -> Result<(), CalibreError> {
    let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;

    let book_filename = filename(book.path.clone(), file_format.clone());
    let dest_path = assets::asset_path(library_root, &book.path, &book_filename);
    std::fs::copy(file_path, &dest_path).map_err(|e| CalibreError::FileSystem(e.to_string()))?;

    // Get file size for database
    let metadata =
        std::fs::metadata(&dest_path).map_err(|e| CalibreError::FileSystem(e.to_string()))?;

    let new_file = crate::entities::book_file::NewBookFile {
        book: book_id.as_i32(),
        format: file_format.to_uppercase(),
        uncompressed_size: metadata.len() as i32,
        name: book.path.clone(),
    };

    match book_files::create(conn, new_file) {
        Ok(_) => Ok(()),
        Err(e) => {
            // If database entry fails, remove the copied file
            let _ = std::fs::remove_file(&dest_path);
            Err(e)
        }
    }
}

pub fn remove_book_file(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    file_format: &str,
) -> Result<(), CalibreError> {
    conn.transaction::<(), CalibreError, _>(|conn| {
        let book = books::get(conn, book_id)?.ok_or(CalibreError::BookNotFound(book_id))?;

        let file =
            book_files::find_by_book_and_format(conn, book_id, file_format.to_string())?.ok_or(
                CalibreError::BookFileNotFound(book_id, file_format.to_string()),
            )?;

        let all_files = book_files::find_by_book_id(conn, book_id)?;
        let is_last_format = all_files.len() == 1;

        if is_last_format {
            delete_entire_book(library_root, conn, book_id, &book.path)?;
        } else {
            book_files::delete(conn, crate::types::BookFileId(file.id))?;

            let book_filename = filename(book.path.clone(), file_format.to_string());
            let file_path = assets::asset_path(library_root, &book.path, &book_filename);

            match std::fs::remove_file(&file_path) {
                Ok(_) => {}
                Err(e) => {
                    eprintln!("WARNING: Failed to delete file {:?}: {}", file_path, e);
                }
            }
        }

        Ok(())
    })
}

fn delete_entire_book(
    library_root: &String,
    conn: &mut SqliteConnection,
    book_id: BookId,
    book_path: &str,
) -> Result<(), CalibreError> {
    book_files::delete_all(conn, book_id)?;

    book_descriptions::delete(conn, book_id)?;

    book_identifiers::delete_all(conn, book_id)?;

    let author_ids = books::find_authors(conn, book_id)?;
    for author_id in author_ids {
        authors::unlink_book(conn, author_id, book_id)?;
    }

    books::delete(conn, book_id)?;

    let book_dir = std::path::Path::new(library_root).join(book_path);
    match std::fs::remove_dir_all(&book_dir) {
        Ok(_) => {}
        Err(e) => {
            eprintln!(
                "WARNING: Failed to delete book directory {:?}: {}",
                book_dir, e
            );
        }
    }

    Ok(())
}

fn filename(book_path: String, file_format: String) -> String {
    let ext = file_format.to_lowercase();
    let base_name = book_path;

    if ext.is_empty() {
        format!("{}", base_name)
    } else {
        format!("{}.{}", base_name, ext)
    }
}
