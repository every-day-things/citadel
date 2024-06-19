use crate::application::services::domain::file::dto::NewFileDto;
use crate::application::services::library::dto::NewLibraryFileDto;
use crate::Book;
use chrono::DateTime;
use chrono::NaiveDateTime;
use chrono::Utc;
use sanitise_file_name::sanitise;

use crate::BookFile;

use std::error::Error;
use std::path::Path;
use std::path::PathBuf;

use std::sync::Arc;
use std::sync::Mutex;

use diesel::RunQueryDsl;

use crate::dtos::author::NewAuthorDto;
use crate::application::services::domain::file::service::BookFileService;
use crate::application::services::domain::file::service::BookFileServiceTrait;
use crate::application::services::library::dto::NewLibraryEntryDto;
use crate::application::services::library::dto::UpdateLibraryEntryDto;

use crate::domain::book::entity::NewBook;
use crate::domain::book::entity::UpdateBookData;
use crate::infrastructure::domain::book_file::repository::BookFileRepository;
use crate::infrastructure::file_service::FileService;
use crate::infrastructure::file_service::FileServiceTrait;
use crate::models::Identifier;
use crate::persistence::establish_connection;
use crate::util::ValidDbPath;
use crate::Author;
use crate::BookWithAuthorsAndFiles;
use crate::ClientV2;

#[derive(Debug)]
pub enum CalibreError {
    DatabaseError,
}

impl std::fmt::Display for CalibreError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for CalibreError {}

pub struct CalibreClient {
    validated_library_path: ValidDbPath,
    client_v2: ClientV2,
}

impl CalibreClient {
    pub fn new(db_path: ValidDbPath) -> CalibreClient {
        CalibreClient {
            validated_library_path: db_path.clone(),
            client_v2: ClientV2::new(db_path),
        }
    }

    pub fn add_book(
        &mut self,
        dto: NewLibraryEntryDto,
    ) -> Result<crate::BookWithAuthorsAndFiles, Box<dyn std::error::Error>> {
    		let file_service = FileService::new(&self.validated_library_path.library_path);

        // 1. Create Authors & Book, then link them.
        // ======================================
        let created_author_list = self.create_authors(dto.authors)?;
        let creatable_book = NewBook::try_from(dto.book.clone()).unwrap();
        let book = self.client_v2.books().create(creatable_book).unwrap();
        let _ = self.client_v2.books().update(
            book.id,
            UpdateBookData {
                author_sort: Some(combined_author_sort(&created_author_list)),
                title: None,
                timestamp: None,
                pubdate: None,
                series_index: None,
                path: None,
                flags: None,
                has_cover: None,
            },
        );
        for author in &created_author_list {
            let _ = self
                .client_v2
                .books()
                .link_author_to_book(book.id, author.id);
        }

        // 2. Create directories for author & book
        // ======================================
        let primary_author = &created_author_list[0];
        let author_dir_name = self.client_v2.authors().name_author_dir(primary_author);

        let book_dir_name = gen_book_folder_name(&dto.book.title, book.id);
        let book_dir_relative_path = Path::new(&author_dir_name).join(&book_dir_name);
        {
            file_service.create_directory(Path::new(&author_dir_name).to_path_buf())?;
            file_service.create_directory(book_dir_relative_path.clone())?;
        }
        // Update Book with relative path to book folder
        let _ = self
            .client_v2
            .books()
            .update(book.id, update_book_data_for_path(&book_dir_relative_path));

        // 3. Copy Book files & cover image to library
        // ===========================
        let mut created_files: Vec<BookFile> = Vec::new();
        if let Some(files) = dto.files {
            // Copy files to library
            let result = self.add_book_files(
                &files,
                &dto.book.title,
                book.id,
                &primary_author.name,
                book_dir_relative_path.clone(),
                &file_service,
            );
            if let Ok(files) = result {
                created_files = files;
            }

            let primary_file = &files[0];
            {
                let book_file_repo = Box::new(BookFileRepository::new(
                    &self.validated_library_path.database_path,
                ));
                let mut book_file_service = BookFileService::new(book_file_repo);

                let cover_data =
                    book_file_service.cover_img_data_from_path(primary_file.path.as_path())?;
                if let Some(cover_data) = cover_data {
                    let cover_path = Path::new(&book_dir_relative_path).join("cover.jpg");
                    let _ = file_service.write_to_file(&cover_path, cover_data);
                }
            }
        }

        // 4. Create Calibre metadata file
        // ===============================
        let metadata_opf = MetadataOpf::new(&book, &created_author_list, Utc::now()).format();
        match metadata_opf {
            Ok(contents) => {
                let metadata_opf_path = Path::new(&book_dir_relative_path).join("metadata.opf");
                let _ =
                    file_service.write_to_file(&metadata_opf_path, contents.as_bytes().to_vec());
            }
            Err(_) => (),
        };

        Ok(BookWithAuthorsAndFiles {
            book,
            authors: created_author_list,
            files: created_files,
        })
    }

    pub fn update_book(
        &mut self,
        book_id: i32,
        updates: UpdateLibraryEntryDto,
    ) -> Result<crate::BookWithAuthorsAndFiles, Box<dyn std::error::Error>> {
        // Write new updates to book
        let book_update = UpdateBookData::try_from(updates.book).unwrap();
        let _book = self.client_v2.books().update(book_id, book_update);

        match updates.author_id_list {
            Some(author_id_list) => {
                // Unlink existing authors
                let existing_authors = self
                    .client_v2
                    .books()
                    .find_author_ids_by_book_id(book_id)
                    .unwrap();
                existing_authors.iter().for_each(|&author_id| {
                    let _ = self
                        .client_v2
                        .books()
                        .unlink_author_from_book(book_id, author_id);
                });

                // Link requested authors to book
                author_id_list.iter().for_each(|author_id| {
                    let author_id_int = author_id.parse::<i32>().unwrap();
                    let _ = self
                        .client_v2
                        .books()
                        .link_author_to_book(book_id, author_id_int);
                });
            }
            None => {}
        }

        self.find_book_with_authors(book_id)
    }

    pub fn find_book_with_authors(
        &mut self,
        book_id: i32,
    ) -> Result<crate::BookWithAuthorsAndFiles, Box<dyn std::error::Error>> {
        let book = self.client_v2.books().find_by_id(book_id).unwrap().unwrap();
        let author_ids = self
            .client_v2
            .books()
            .find_author_ids_by_book_id(book_id)
            .unwrap();

        let authors: Vec<Author> = author_ids
            .into_iter()
            .map(|author_id| {
                let authors = self.client_v2.authors().find_by_id(author_id);
                match authors {
                    Ok(Some(author)) => Ok(author),
                    _ => Err(ClientError::GenericError),
                }
            })
            .map(|item| item.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        let database_path = self.validated_library_path.database_path.clone();
        let book_file_repo = Box::new(BookFileRepository::new(&database_path));
        let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
        let mut file_repo_guard = book_file_service
            .lock()
            .map_err(|_| ClientError::GenericError)?;
        let files = file_repo_guard
            .find_all_for_book_id(book.id)
            .map_err(|_| ClientError::GenericError)?;

        Ok(BookWithAuthorsAndFiles {
            book,
            authors,
            files,
        })
    }

    pub fn find_all(
        &mut self,
    ) -> Result<Vec<crate::BookWithAuthorsAndFiles>, Box<dyn std::error::Error>> {
        let mut book_list = Vec::new();
        let books = self.client_v2.books().list().unwrap();

        for book in books {
            let result = self.find_book_with_authors(book.id);
            match result {
                Ok(res) => book_list.push(res),
                Err(_) => (),
            }
        }

        Ok(book_list)
    }

    pub fn list_all_authors(&mut self) -> Result<Vec<crate::Author>, Box<dyn std::error::Error>> {
        self.client_v2
            .authors()
            .list()
            .map_err(|_| Box::new(CalibreError::DatabaseError) as Box<dyn std::error::Error>)
    }

    pub fn list_identifiers_for_book(
        &mut self,
        book_id: i32,
    ) -> Result<Vec<Identifier>, Box<dyn std::error::Error>> {
        self.client_v2
            .books()
            .list_identifiers_for_book(book_id)
            .map_err(|_| Box::new(CalibreError::DatabaseError) as Box<dyn std::error::Error>)
    }

    fn create_authors(
        &mut self,
        authors: Vec<NewAuthorDto>,
    ) -> Result<Vec<Author>, Box<dyn Error>> {
        let x = authors
            .into_iter()
            .map(|dto| self.client_v2.authors().create_if_missing(dto).unwrap())
            .collect::<Vec<Author>>();

        Ok(x)
    }

    fn add_book_files(
        &self,
        files: &Vec<NewLibraryFileDto>,
        book_title: &String,
        book_id: i32,
        primary_author_name: &String,
        book_dir_rel_path: PathBuf,
        file_service: &FileService,
    ) -> Result<Vec<BookFile>, ClientError> {
        let book_file_repo = Box::new(BookFileRepository::new(
            &self.validated_library_path.database_path,
        ));
        let mut book_file_service = BookFileService::new(book_file_repo);

        files
            .iter()
            .map(|file| {
                let book_file_name = gen_book_file_name(book_title, primary_author_name);
                let added_book = book_file_service
                    .create(NewFileDto {
                        path: file.path.clone(),
                        book_id,
                        name: book_file_name,
                    })
                    .map_err(|_| ClientError::GenericError)?;

                let book_rel_path = Path::new(&book_dir_rel_path).join(&added_book.as_filename());
                let _ = file_service
                    .copy_file_to_directory(file.path.as_path(), book_rel_path.as_path())
                    .map_err(|_| ClientError::GenericError);

                Ok(added_book)
            })
            .collect::<Result<Vec<BookFile>, ClientError>>()
    }

    /// Updates the library's ID to a new UUID.
    ///
    /// You probably do not need this method, unless you're creating a new
    /// library from an existing database and want to avoid UUID conflicts.
    pub fn dontusethis_randomize_library_uuid(&mut self) -> Result<(), CalibreError> {
        let conn = establish_connection(&self.validated_library_path.database_path);
        conn.map(|mut c| {
            diesel::sql_query("UPDATE library_id SET uuid = uuid4()")
                .execute(&mut c)
                .expect("Failed to set new UUID");
        })
        .map_err(|_| CalibreError::DatabaseError)
    }
}

fn combined_author_sort(author_list: &Vec<Author>) -> String {
    author_list
        .iter()
        .map(|author| author.sortable_name())
        .collect::<Vec<String>>()
        .join(" & ")
}

fn update_book_data_for_path(path: &PathBuf) -> UpdateBookData {
    let path_as_string = path.to_str().unwrap().to_string();
    UpdateBookData {
        author_sort: None,
        title: None,
        timestamp: None,
        pubdate: None,
        series_index: None,
        path: Some(path_as_string),
        flags: None,
        has_cover: None,
    }
}

fn gen_book_file_name(book_title: &String, author_name: &String) -> String {
    sanitise(
        &"{title} - {author}"
            .replace("{title}", book_title)
            .replace("{author}", author_name),
    )
}

fn gen_book_folder_name(book_name: &String, book_id: i32) -> String {
    sanitise(
        &"{title} ({id})"
            .replace("{title}", book_name)
            .replace("{id}", &book_id.to_string()),
    )
}

struct MetadataOpf<'a> {
    book: &'a Book,
    author_list: &'a Vec<Author>,
    now: DateTime<Utc>,
}

impl<'a> MetadataOpf<'a> {
    pub fn new(book: &'a Book, author_list: &'a Vec<Author>, now: DateTime<Utc>) -> Self {
        Self {
            book,
            author_list,
            now,
        }
    }

    pub fn format(&self) -> Result<String, ()> {
        let book_custom_author_sort = self
            .book
            .author_sort
            .clone()
            .unwrap_or_else(|| self.get_author_sort_string(&self.author_list));

        let tags_string = self.get_tags_string(Vec::new());
        let authors_string = self.get_authors_string(&self.author_list, &book_custom_author_sort);

        Ok(self.format_metadata_opf(&self.book, &authors_string, &tags_string, &self.now))
    }

    fn get_author_sort_string(&self, author_list: &Vec<Author>) -> String {
        author_list
            .iter()
            .map(|author| author.name.clone())
            .collect::<Vec<String>>()
            .join(", ")
    }

    fn get_tags_string(&self, tags: Vec<String>) -> String {
        tags.iter()
            .map(|tag| format!("<dc:subject>{}</dc:subject>", tag))
            .collect::<String>()
    }

    fn get_authors_string(
        &self,
        author_list: &Vec<Author>,
        book_custom_author_sort: &String,
    ) -> String {
        author_list
            .iter()
            .map(|author| {
                format!(
                    "<dc:creator opf:file-as=\"{sortable}\" opf:role=\"aut\">{author}</dc:creator>",
                    sortable = book_custom_author_sort.as_str(),
                    author = author.name
                )
            })
            .collect::<String>()
    }

    fn format_metadata_opf(
        &self,
        book: &Book,
        authors_string: &String,
        tags_string: &String,
        now: &DateTime<Utc>,
    ) -> String {
        format!(
            r#"<?xml version='1.0' encoding='utf-8'?>
        <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uuid_id" version="2.0">
          <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
            <dc:identifier opf:scheme="calibre" id="calibre_id">{calibre_id}</dc:identifier>
            <dc:identifier opf:scheme="uuid" id="uuid_id">{calibre_uuid}</dc:identifier>
            <dc:title>{book_title}</dc:title>
            {authors}
            <dc:contributor opf:file-as="calibre" opf:role="bkp">citadel (1.0.0) [https://github.com/every-day-things/citadel]</dc:contributor>
            <dc:date>{pub_date}</dc:date>
            <dc:language>{language_iso_639_2}</dc:language>
            {tags}
            <meta name="calibre:timestamp" content="{now}"/>
            <meta name="calibre:title_sort" content="{book_title_sortable}"/>
          </metadata>
          <guide>
            <reference type="cover" title="Cover" href="cover.jpg"/>
          </guide>
        </package>"#,
            calibre_id = book.id,
            calibre_uuid = &book.uuid.clone().unwrap_or("".to_string()).as_str(),
            book_title = book.title,
            authors = authors_string,
            pub_date = book
                .pubdate
                .unwrap_or(NaiveDateTime::from_timestamp_millis(0).unwrap())
                .to_string()
                .as_str(),
            language_iso_639_2 = "en",
            tags = tags_string,
            now = now.to_string(),
            book_title_sortable = &book.sort.clone().unwrap_or("".to_string()).as_str()
        )
    }
}

#[derive(Debug)]
enum ClientError {
	GenericError
}
impl std::fmt::Display for ClientError {
	fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
		write!(f, "{:?}", self)
	}
}
impl std::error::Error for ClientError {}
