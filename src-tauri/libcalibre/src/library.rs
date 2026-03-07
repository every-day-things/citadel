use std::{collections::HashMap, path::Path, path::PathBuf};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::{
    prelude::*, sql_query, sql_types::Integer, QueryableByName, RunQueryDsl, SqliteConnection,
};
use sanitise_file_name::sanitise;

use crate::{
    cover_image::cover_image_data_from_path,
    entities::book_file::NewBookFile,
    operations,
    persistence::establish_connection,
    queries::{authors as author_queries, book_files, books as book_queries},
    sorting,
    types::{AuthorId, BookId},
    util::ValidDbPath,
    CalibreError, NewBook, UpdateBookData,
};

pub struct Library {
    db_path: ValidDbPath,
    conn: SqliteConnection,
}

#[derive(Clone, Debug)]
pub struct Book {
    /// Identifier unique only within this library
    pub id: BookId,
    /// Cross-library identifier
    pub uuid: String,
    pub title: String,
    pub sortable_title: Option<String>,
    pub authors: Vec<Author>,
    pub description: Option<String>,
    pub identifiers: Vec<BookIdentifier>,
    pub has_cover: bool,
    pub is_read: bool,
    pub files: Vec<BookFileInfo>,
    /// Calibre calls this `timestamp`. Set when book is first added.
    pub created_at: NaiveDateTime,
    /// Calibre calls this `last_modified`. Updated when book metadata changes.
    pub updated_at: NaiveDateTime,
    /// Relative to library root, what folder contains this book's files & cover
    pub book_dir_path: String,
}

#[derive(Clone, Debug)]
pub struct BookFileInfo {
    pub id: i32,
    pub format: String,
    pub name: String,
    pub uncompressed_size: i32,
}

#[derive(Clone, Debug)]
pub struct BookIdentifier {
    pub id: i32,
    pub label: String,
    pub value: String,
}

pub struct BookAdd {
    pub title: String,
    pub author_names: Vec<String>,
    pub tags: Option<Vec<String>>,
    pub series: Option<String>,
    pub series_index: Option<f32>,
    pub publisher: Option<String>,
    pub publication_date: Option<NaiveDate>,
    pub rating: Option<i32>,
    pub comments: Option<String>,
    pub identifiers: HashMap<String, String>,
    pub file_paths: Vec<PathBuf>,
}

pub struct BookUpdate {
    pub title: Option<String>,

    /// If provided, replaces all authors with the provided list. Authors
    /// not already in the database will be created. Removes any author not
    /// included in the list.
    /// **Do not use both `author_names` and `author_ids` at the same time.**
    pub author_names: Option<Vec<String>>,
    /// If provided, replaces all authors with the provided list of IDs. Authors
    /// not already in the database will cause an error. Removes any author not
    /// included in the list.
    /// **Do not use both `author_names` and `author_ids` at the same time.**
    pub author_ids: Option<Vec<AuthorId>>,

    pub description: Option<String>,
    pub is_read: Option<bool>,

    pub tags: Option<Vec<String>>,
    pub series: Option<String>,
    pub series_index: Option<f32>,
    pub publisher: Option<String>,
    pub publication_date: Option<NaiveDate>,
    pub rating: Option<i32>,
    pub comments: Option<String>,
    pub identifiers: Option<HashMap<String, String>>,
}

#[derive(Clone, Debug)]
pub struct Author {
    pub id: AuthorId,
    pub name: String,
    pub sort: String,
    pub link: Option<String>,
}

pub struct AuthorAdd {
    pub name: String,
    pub sort: Option<String>,
    pub link: Option<String>,
}

pub struct AuthorUpdate {
    pub name: Option<String>,
    pub sort: Option<String>,
    pub link: Option<String>,
}

impl Library {
    pub fn new(db_path: ValidDbPath) -> Result<Self, CalibreError> {
        let conn = establish_connection(&db_path.database_path)
            .map_err(|_| CalibreError::LibraryNotInitialized)?;

        Ok(Self { db_path, conn })
    }

    /// Create a new Calibre library in the provided folder.
    pub fn create_library_at(_path: &str) -> Result<Library, CalibreError> {
        todo!()
    }

    pub fn library_path(&self) -> &str {
        &self.db_path.library_path
    }

    pub fn database_path(&self) -> &str {
        &self.db_path.database_path
    }

    // =========================================================================
    // Books
    // =========================================================================

    pub fn add_book(&mut self, book: BookAdd) -> Result<Book, CalibreError> {
        // 1. Create/find authors
        let created_authors: Vec<crate::entities::author::Author> = book
            .author_names
            .iter()
            .map(|name| author_queries::create_if_not_exists(&mut self.conn, name))
            .collect::<Result<Vec<_>, _>>()?;

        // 2. Create book record
        let new_book = NewBook {
            title: book.title.clone(),
            timestamp: None,
            pubdate: book
                .publication_date
                .map(|d| NaiveDateTime::new(d, chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap())),
            series_index: book.series_index.unwrap_or(1.0),
            has_cover: None,
        };
        let book_row = book_queries::create(&mut self.conn, new_book)?;

        // Re-fetch to get trigger-generated uuid and sort
        let book_row = book_queries::get(&mut self.conn, BookId(book_row.id))?
            .ok_or(CalibreError::BookNotFound(BookId(book_row.id)))?;

        // 3. Set author_sort and link authors
        let combined_sort = created_authors
            .iter()
            .map(|a| sorting::sort_author_name_apa(&a.name))
            .collect::<Vec<String>>()
            .join(" & ");
        let _ = book_queries::update(
            &mut self.conn,
            BookId(book_row.id),
            UpdateBookData {
                author_sort: Some(combined_sort),
                ..Default::default()
            },
        );

        for author in &created_authors {
            author_queries::link_book(&mut self.conn, AuthorId(author.id), BookId(book_row.id))?;
        }

        // 4. Create directories
        let primary_author = created_authors
            .first()
            .map(|a| a.name.clone())
            .unwrap_or_default();
        let author_dir_name = primary_author.clone();
        let book_dir_name = sanitise(&format!("{} ({})", &book.title, book_row.id));
        let book_dir_relative = Path::new(&author_dir_name).join(&book_dir_name);
        let library_root = Path::new(&self.db_path.library_path);

        std::fs::create_dir_all(library_root.join(&book_dir_relative))
            .map_err(|e| CalibreError::FileSystem(e.to_string()))?;

        // Update book with relative path
        let _ = book_queries::update(
            &mut self.conn,
            BookId(book_row.id),
            UpdateBookData {
                path: Some(book_dir_relative.to_str().unwrap().to_string()),
                ..Default::default()
            },
        );

        // 5. Copy book files
        let mut created_files = Vec::new();
        for file_path in &book.file_paths {
            let extension = file_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_uppercase();
            let file_stem = sanitise(&format!("{} - {}", &book.title, &primary_author));
            let file_size = std::fs::metadata(file_path)
                .map(|m| m.len() as i32)
                .unwrap_or(0);

            let new_file = NewBookFile {
                book: book_row.id,
                format: extension.clone(),
                uncompressed_size: file_size,
                name: file_stem.clone(),
            };
            book_files::create(&mut self.conn, new_file)?;

            // Copy file to library
            let dest_filename = if extension.is_empty() {
                file_stem.clone()
            } else {
                format!("{}.{}", file_stem, extension.to_lowercase())
            };
            let dest_path = library_root.join(&book_dir_relative).join(&dest_filename);
            if file_path.exists() {
                std::fs::copy(file_path, &dest_path)
                    .map_err(|e| CalibreError::FileSystem(e.to_string()))?;
            }

            created_files.push(crate::entities::book_file::BookFile {
                id: 0, // We don't have the ID from create, but it's fine for now
                book: book_row.id,
                format: extension,
                uncompressed_size: file_size,
                name: file_stem,
            });
        }

        // 6. Extract cover image
        if let Some(primary_file) = book.file_paths.first() {
            if let Ok(Some(cover_data)) = cover_image_data_from_path(primary_file) {
                let cover_path = library_root.join(&book_dir_relative).join("cover.jpg");
                let _ = std::fs::write(&cover_path, &cover_data);
                let _ = book_queries::update(
                    &mut self.conn,
                    BookId(book_row.id),
                    UpdateBookData {
                        has_cover: Some(true),
                        ..Default::default()
                    },
                );
            }
        }

        // 7. Generate metadata.opf
        let book_row_final = book_queries::get(&mut self.conn, BookId(book_row.id))?
            .ok_or(CalibreError::BookNotFound(BookId(book_row.id)))?;
        let metadata_opf = format_metadata_opf(&book_row_final, &created_authors);
        if let Ok(contents) = metadata_opf {
            let opf_path = library_root.join(&book_dir_relative).join("metadata.opf");
            let _ = std::fs::write(&opf_path, contents.as_bytes());
        }

        self.get_book(BookId(book_row.id))
    }

    pub fn books(&mut self) -> Result<Vec<Book>, CalibreError> {
        let mut books = operations::books::all(&mut self.conn)?;

        // Fill in read states
        let book_ids: Vec<BookId> = books.iter().map(|b| b.id).collect();
        let read_states = self.batch_get_read_states(&book_ids)?;
        for book in &mut books {
            book.is_read = read_states.get(&book.id).copied().unwrap_or(false);
        }

        Ok(books)
    }

    pub fn get_book(&mut self, book_id: BookId) -> Result<Book, CalibreError> {
        let mut book = operations::books::get_book(&mut self.conn, book_id)?;
        book.is_read = self.get_book_read_state(book_id)?;
        Ok(book)
    }

    pub fn update_book(
        &mut self,
        book_id: BookId,
        update: BookUpdate,
    ) -> Result<Book, CalibreError> {
        // Handle is_read separately since it uses custom columns
        let is_read_update = update.is_read;

        operations::books::update_book(&mut self.conn, book_id, update)?;

        if let Some(is_read) = is_read_update {
            self.set_book_read_state(book_id, is_read)?;
        }

        self.get_book(book_id)
    }

    pub fn remove_books(&mut self, book_ids: Vec<BookId>) -> Result<Vec<BookId>, CalibreError> {
        let mut removed = Vec::new();
        for book_id in book_ids {
            let book = book_queries::get(&mut self.conn, book_id)?
                .ok_or(CalibreError::BookNotFound(book_id))?;
            operations::assets::delete_entire_book(
                &self.db_path.library_path,
                &mut self.conn,
                book_id,
                &book.path,
            )?;
            removed.push(book_id);
        }
        Ok(removed)
    }

    // =========================================================================
    // Assets (covers, book files)
    // =========================================================================

    pub fn get_book_cover(&mut self, book_id: BookId) -> Result<Vec<u8>, CalibreError> {
        operations::assets::get_book_cover(&self.db_path.library_path, &mut self.conn, book_id)
    }

    pub fn set_book_cover(
        &mut self,
        book_id: BookId,
        cover_data: Vec<u8>,
    ) -> Result<(), CalibreError> {
        operations::assets::set_book_cover(&self.db_path.library_path, &mut self.conn, book_id, cover_data)
    }

    pub fn remove_book_cover(&mut self, _book_id: BookId) -> Result<(), CalibreError> {
        todo!()
    }

    pub fn get_book_file(
        &mut self,
        book_id: BookId,
        file_format: &str,
    ) -> Result<Vec<u8>, CalibreError> {
        operations::assets::get_book_file(
            &self.db_path.library_path,
            &mut self.conn,
            book_id,
            file_format,
        )
    }

    pub fn get_book_file_path(
        &mut self,
        id: BookId,
        format: &str,
    ) -> Result<PathBuf, CalibreError> {
        operations::assets::get_book_file_path(
            &self.db_path.library_path,
            &mut self.conn,
            id,
            format,
        )
    }

    pub fn remove_book_file(&mut self, book_id: BookId, format: &str) -> Result<(), CalibreError> {
        operations::assets::remove_book_file(
            &self.db_path.library_path,
            &mut self.conn,
            book_id,
            format,
        )
    }

    pub fn add_book_file_from_bytes(
        &mut self,
        book_id: BookId,
        file_format: String,
        file_data: Vec<u8>,
    ) -> Result<(), CalibreError> {
        operations::assets::add_book_file_from_bytes(
            &self.db_path.library_path,
            &mut self.conn,
            book_id,
            file_format,
            file_data,
        )
    }

    pub fn add_book_file_from_path(
        &mut self,
        book_id: BookId,
        file_format: String,
        file_path: String,
    ) -> Result<(), CalibreError> {
        operations::assets::add_book_file_from_path(
            &self.db_path.library_path,
            &mut self.conn,
            book_id,
            file_format,
            file_path,
        )
    }

    // =========================================================================
    // Authors
    // =========================================================================

    pub fn add_author(&mut self, author: AuthorAdd) -> Result<AuthorId, CalibreError> {
        let new_author = operations::authors::add(&mut self.conn, author)?;
        Ok(new_author.id)
    }

    pub fn authors(&mut self) -> Result<Vec<Author>, CalibreError> {
        operations::authors::all(&mut self.conn)
    }

    pub fn get_author(&mut self, author_id: AuthorId) -> Result<Author, CalibreError> {
        operations::authors::get(&mut self.conn, author_id)
    }

    pub fn update_author(
        &mut self,
        author_id: AuthorId,
        update: AuthorUpdate,
    ) -> Result<Author, CalibreError> {
        operations::authors::update(&mut self.conn, author_id, update)
    }

    pub fn remove_author(&mut self, author_id: AuthorId) -> Result<AuthorId, CalibreError> {
        operations::authors::remove(&mut self.conn, author_id)?;
        Ok(author_id)
    }

    // =========================================================================
    // Identifiers
    // =========================================================================

    pub fn upsert_book_identifier(
        &mut self,
        book_id: BookId,
        label: String,
        value: String,
        existing_id: Option<i32>,
    ) -> Result<i32, CalibreError> {
        use crate::schema::identifiers::dsl;

        match existing_id {
            Some(identifier_id) => {
                diesel::update(dsl::identifiers.filter(dsl::id.eq(identifier_id)))
                    .set((dsl::type_.eq(&label), dsl::val.eq(&value)))
                    .returning(dsl::id)
                    .get_result::<i32>(&mut self.conn)
                    .map_err(CalibreError::from)
            }
            None => {
                let lowercased_label = label.to_lowercase();
                diesel::insert_into(dsl::identifiers)
                    .values((
                        dsl::book.eq(book_id.as_i32()),
                        dsl::type_.eq(lowercased_label),
                        dsl::val.eq(&value),
                    ))
                    .returning(dsl::id)
                    .get_result::<i32>(&mut self.conn)
                    .map_err(CalibreError::from)
            }
        }
    }

    pub fn delete_book_identifier(
        &mut self,
        book_id: BookId,
        identifier_id: i32,
    ) -> Result<(), CalibreError> {
        use crate::schema::identifiers::dsl;

        diesel::delete(
            dsl::identifiers
                .filter(dsl::book.eq(book_id.as_i32()))
                .filter(dsl::id.eq(identifier_id)),
        )
        .execute(&mut self.conn)
        .map(|_| ())
        .map_err(CalibreError::from)
    }

    // =========================================================================
    // Read state (custom column)
    // =========================================================================

    pub(crate) fn get_or_create_read_state_column(&mut self) -> Result<i32, CalibreError> {
        use crate::schema::custom_columns::dsl::*;
        use diesel::prelude::*;

        let column_id_opt = custom_columns
            .select(id)
            .filter(label.eq("read"))
            .filter(datatype.eq("bool"))
            .first::<i32>(&mut self.conn)
            .optional()
            .map_err(CalibreError::from)?;

        match column_id_opt {
            Some(cid) => Ok(cid),
            None => {
                let cid = diesel::insert_into(custom_columns)
                    .values((
                        label.eq("read"),
                        name.eq("Read"),
                        datatype.eq("bool"),
                        mark_for_delete.eq(false),
                        editable.eq(true),
                        is_multiple.eq(false),
                        normalized.eq(false),
                        display.eq("{}"),
                    ))
                    .returning(id)
                    .get_result::<i32>(&mut self.conn)
                    .map_err(CalibreError::from)?;

                sql_query(format!(
                    "CREATE TABLE custom_column_{cid} (id INTEGER PRIMARY KEY, book INTEGER NOT NULL UNIQUE, value INTEGER NOT NULL);"
                ))
                .execute(&mut self.conn)
                .map_err(CalibreError::from)?;

                Ok(cid)
            }
        }
    }

    pub fn get_book_read_state(&mut self, book_id: BookId) -> Result<bool, CalibreError> {
        let col_id = self.get_or_create_read_state_column()?;

        #[derive(QueryableByName)]
        struct CustomValue {
            #[diesel(sql_type = Integer)]
            value: i32,
        }

        let result = sql_query(format!(
            "SELECT value FROM custom_column_{col_id} WHERE book = ?"
        ))
        .bind::<Integer, _>(book_id.as_i32())
        .get_result::<CustomValue>(&mut self.conn);

        match result {
            Ok(v) => Ok(v.value == 1),
            Err(_) => Ok(false),
        }
    }

    pub fn set_book_read_state(
        &mut self,
        book_id: BookId,
        is_read: bool,
    ) -> Result<(), CalibreError> {
        let col_id = self.get_or_create_read_state_column()?;
        let value = if is_read { 1 } else { 0 };

        sql_query(format!(
            "INSERT OR REPLACE INTO custom_column_{col_id} (book, value) VALUES (?, ?)"
        ))
        .bind::<Integer, _>(book_id.as_i32())
        .bind::<Integer, _>(value)
        .execute(&mut self.conn)
        .map(|_| ())
        .map_err(CalibreError::from)
    }

    pub fn batch_get_read_states(
        &mut self,
        book_ids: &[BookId],
    ) -> Result<HashMap<BookId, bool>, CalibreError> {
        if book_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let col_id = self.get_or_create_read_state_column()?;

        #[derive(QueryableByName)]
        struct BookReadState {
            #[diesel(sql_type = Integer)]
            book: i32,
            #[diesel(sql_type = Integer)]
            value: i32,
        }

        let book_ids_str = book_ids
            .iter()
            .map(|id| id.as_i32().to_string())
            .collect::<Vec<_>>()
            .join(",");

        let results: Vec<BookReadState> = sql_query(format!(
            "SELECT book, value FROM custom_column_{col_id} WHERE book IN ({book_ids_str})"
        ))
        .load(&mut self.conn)
        .map_err(CalibreError::from)?;

        Ok(results
            .into_iter()
            .map(|r| (BookId(r.book), r.value == 1))
            .collect())
    }

    // =========================================================================
    // Library management
    // =========================================================================

    pub fn randomize_library_uuid(&mut self) -> Result<(), CalibreError> {
        sql_query("UPDATE library_id SET uuid = uuid4()")
            .execute(&mut self.conn)
            .map(|_| ())
            .map_err(CalibreError::from)
    }

    // =========================================================================
    // Search
    // =========================================================================

    pub fn search_books(&mut self, _query: &str) -> Result<Vec<Book>, CalibreError> {
        todo!()
    }
}

// =============================================================================
// Metadata OPF generation (ported from calibre_client.rs)
// =============================================================================

fn format_metadata_opf(
    book: &crate::entities::book_row::BookRow,
    authors: &[crate::entities::author::Author],
) -> Result<String, ()> {
    let author_sort = book.author_sort.clone().unwrap_or_else(|| {
        authors
            .iter()
            .map(|a| a.name.clone())
            .collect::<Vec<String>>()
            .join(", ")
    });

    let authors_string: String = authors
        .iter()
        .map(|author| {
            format!(
                "<dc:creator opf:file-as=\"{sortable}\" opf:role=\"aut\">{author}</dc:creator>",
                sortable = author_sort,
                author = author.name
            )
        })
        .collect();

    Ok(format!(
        r#"<?xml version='1.0' encoding='utf-8'?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uuid_id" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier opf:scheme="calibre" id="calibre_id">{calibre_id}</dc:identifier>
    <dc:identifier opf:scheme="uuid" id="uuid_id">{calibre_uuid}</dc:identifier>
    <dc:title>{book_title}</dc:title>
    {authors}
    <dc:contributor opf:file-as="calibre" opf:role="bkp">citadel (1.0.0) [https://github.com/every-day-things/citadel]</dc:contributor>
    <dc:date>{pub_date}</dc:date>
    <dc:language>en</dc:language>
    <meta name="calibre:timestamp" content="{now}"/>
    <meta name="calibre:title_sort" content="{book_title_sortable}"/>
  </metadata>
  <guide>
    <reference type="cover" title="Cover" href="cover.jpg"/>
  </guide>
</package>"#,
        calibre_id = book.id,
        calibre_uuid = book.uuid.as_deref().unwrap_or(""),
        book_title = book.title,
        authors = authors_string,
        pub_date = book
            .pubdate
            .unwrap_or(NaiveDateTime::UNIX_EPOCH)
            .to_string(),
        now = chrono::Utc::now().to_string(),
        book_title_sortable = book.sort.as_deref().unwrap_or("")
    ))
}
