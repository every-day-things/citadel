use std::error::Error;
use std::path::{Path, PathBuf};
use std::result::Result;
use std::sync::{Arc, Mutex};

use chrono::{DateTime, NaiveDateTime, Utc};

use crate::application::services::domain::author::dto::NewAuthorDto;
use crate::application::services::domain::author::service::AuthorServiceTrait;
use crate::application::services::domain::book::dto::{NewBookDto, UpdateBookDto};
use crate::application::services::domain::book::service::BookServiceTrait;
use crate::application::services::domain::file::dto::NewFileDto;
use crate::application::services::domain::file::service::BookFileServiceTrait;
use crate::domain::author::entity::Author;
use crate::domain::book::aggregate::BookWithAuthorsAndFiles;
use crate::infrastructure::file_service::FileServiceTrait;
use crate::{Book, BookFile};

use super::dto::{NewLibraryEntryDto, NewLibraryFileDto};

#[derive(Debug)]
pub enum BAASError {
    InvalidDto,
    DatabaseBookWriteFailed,
    DatabaseAuthorWriteFailed,
    BookAuthorLinkFailed,
    DatabaseLocked,
    NotFoundBookFiles,
    NotFoundBook,
    NotFoundAuthor,
}

impl std::fmt::Display for BAASError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for BAASError {}

pub enum MIMETYPE {
    EPUB,
    UNKNOWN,
}

impl MIMETYPE {
    pub fn as_str(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "application/epub+zip",
            MIMETYPE::UNKNOWN => "application/octet-stream",
        }
    }

    pub fn from_str(mimetype: &str) -> Option<Self> {
        match mimetype {
            "application/epub+zip" => Some(MIMETYPE::EPUB),
            "application/octet-stream" => Some(MIMETYPE::UNKNOWN),
            _ => None,
        }
    }

    pub fn to_file_extension(&self) -> &'static str {
        match *self {
            MIMETYPE::EPUB => "epub",
            MIMETYPE::UNKNOWN => "",
        }
    }

    pub fn from_file_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "epub" => Some(MIMETYPE::EPUB),
            _ => None,
        }
    }
}

fn gen_book_folder_name(book_name: &String, book_id: i32) -> String {
    "{title} ({id})"
        .replace("{title}", book_name)
        .replace("{id}", &book_id.to_string())
}

fn gen_book_file_name(book_title: &String, author_name: &String) -> String {
    "{title} - {author}"
        .replace("{title}", book_title)
        .replace("{author}", author_name)
}

pub struct LibraryService<BS, AS, FS, BFS>
where
    BS: BookServiceTrait,
    AS: AuthorServiceTrait,
    FS: FileServiceTrait,
    BFS: BookFileServiceTrait,
{
    book_service: Arc<Mutex<BS>>,
    author_service: Arc<Mutex<AS>>,
    file_service: Arc<Mutex<FS>>,
    book_file_service: Arc<Mutex<BFS>>,
}

impl<BS, AS, FS, BFS> LibraryService<BS, AS, FS, BFS>
where
    BS: BookServiceTrait + 'static,
    AS: AuthorServiceTrait + 'static,
    FS: FileServiceTrait + 'static,
    BFS: BookFileServiceTrait + 'static,
{
    pub fn new(
        book_service: Arc<Mutex<BS>>,
        author_service: Arc<Mutex<AS>>,
        file_service: Arc<Mutex<FS>>,
        book_file_service: Arc<Mutex<BFS>>,
    ) -> Self {
        Self {
            book_service,
            author_service,
            file_service,
            book_file_service,
        }
    }

    pub fn create(
        &mut self,
        dto: NewLibraryEntryDto,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        // 1. Create Authors & Books and link them
        // ========================
        let author_list = self.create_authors(dto.authors.clone())?;
        let book = self.create_book(dto.book.clone())?;
        let primary_author = author_list[0].clone();

        for author in &author_list {
            let mut book_service = self.book_service.lock().unwrap();
            book_service
                .link_book_to_author(book.id, author.id)
                .map_err(|_| BAASError::BookAuthorLinkFailed)?;
        }

        // 2. Create Directories for Author & Book
        // ======================================
        let author_dir_name = {
            let mut author_service = self.author_service.lock().unwrap();
            author_service.name_author_dir(&primary_author)
        };

        let book_dir_name = gen_book_folder_name(&dto.book.title, book.id);
        let book_dir_relative_path = Path::new(&author_dir_name).join(&book_dir_name);

        {
            let file_service = self.file_service.lock().unwrap();
            file_service.create_directory(Path::new(&author_dir_name).to_path_buf())?;
            file_service.create_directory(book_dir_relative_path.clone())?;
        }
        // Update Book with relative path to book folder
        let _ = self.set_book_path(book.id, book_dir_relative_path.clone());

        // 3. Copy Book files & cover image to library
        // ===========================

        let mut created_files: Vec<BookFile> = Vec::new();
        if let Some(files) = dto.files {
            // Copy files to library
            let result = self.add_book_files(
                &files,
                &dto.book.title.clone(),
                book.id,
                &primary_author.name,
                book_dir_relative_path.clone(),
            );
            match result {
                Ok(files) => created_files = files,
                Err(_) => {}
            }

            // If a Cover Image exists, copy it to library
            let primary_file = &files[0];
            {
                let mut bfs = self.book_file_service.lock().unwrap();
                let fs = self.file_service.lock().unwrap();

                let cover_data = bfs.cover_img_data_from_path(primary_file.path.as_path())?;
                match cover_data {
                    None => {}
                    Some(cover_data) => {
                        let cover_path = Path::new(&book_dir_relative_path).join("cover.jpg");
                        let write_res = fs.write_to_file(&cover_path, cover_data);
                        println!("{:?}", write_res)
                    }
                }
            }
        }

        // 4. Create Calibre metadata file
        // ===============================
        let metadata_opf_contents = self.metadata_opf_for_book_id(book.id, Utc::now());
        match metadata_opf_contents {
            Ok(contents) => {
                let metadata_opf_path = Path::new(&book_dir_relative_path).join("metadata.opf");
                let write_res = self
                    .file_service
                    .lock()
                    .unwrap()
                    .write_to_file(&metadata_opf_path, contents.as_bytes().to_vec());
                println!("{:?}", write_res)
            }
            Err(_) => {}
        }

        Ok(BookWithAuthorsAndFiles {
            book,
            authors: author_list,
            files: created_files
        })
    }

    pub fn find_book_with_authors(
        &mut self,
        id: i32,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        let mut book_service = self.book_service.lock().unwrap();
        let book = book_service.find_by_id(id).map_err(|_| "Book not found")?;

        let author_ids = book_service
            .find_author_ids_by_book_id(id)
            .map_err(|_| "Author not found")?;

        let authors: Vec<Author> = author_ids
            .into_iter()
            .map(|author_id| {
                let mut author_service = self.author_service.lock().unwrap();
                match author_service.find_by_id(author_id) {
                    Ok(Some(author)) => Ok(author),
                    _ => Err(BAASError::NotFoundAuthor),
                }
            })
            .map(|item| item.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        let mut file_repo_guard = self
            .book_file_service
            .lock()
            .map_err(|_| "File Repository cannot be used by this thread")?;
        let files = file_repo_guard
            .find_all_for_book_id(book.id)
            .map_err(|_| "Could not find files for book")?;

        Ok(BookWithAuthorsAndFiles {
            book,
            authors,
            files,
        })
    }

    pub fn find_all(&mut self) -> Result<Vec<BookWithAuthorsAndFiles>, Box<dyn Error>> {
        let mut book_service = self.book_service.lock().unwrap();
        let books = book_service
            .all()
            .map_err(|_| "Could not read database to find books")?;

        let mut book_list = Vec::new();
        for book in books {
            let author_ids = book_service
                .find_author_ids_by_book_id(book.id)
                .map_err(|_| "Author not found")?;

            let authors: Vec<Author> = author_ids
                .into_iter()
                .map(|author_id| {
                    let mut author_service = self.author_service.lock().unwrap();
                    match author_service.find_by_id(author_id) {
                        Ok(Some(author)) => Ok(author),
                        _ => Err(BAASError::NotFoundAuthor),
                    }
                })
                .map(|item| item.map_err(|e| e.into()))
                .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

            let mut file_repo_guard = self
                .book_file_service
                .lock()
                .map_err(|_| "File Repository cannot be used by this thread")?;
            let files = file_repo_guard
                .find_all_for_book_id(book.id)
                .map_err(|_| "Could not find files for book")?;

            book_list.push(BookWithAuthorsAndFiles {
                book,
                authors,
                files,
            });
        }

        Ok(book_list)
    }

    fn create_authors(
        &mut self,
        authors: Vec<NewAuthorDto>,
    ) -> Result<Vec<Author>, Box<dyn Error>> {
        let author_list = authors
            .into_iter()
            .map(|dto| {
                let mut author_service = self.author_service.lock().unwrap();
                author_service
                    .create(dto)
                    .map_err(|_| BAASError::DatabaseAuthorWriteFailed)
            })
            .map(|res| res.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        Ok(author_list)
    }

    fn create_book(&self, book: NewBookDto) -> Result<Book, BAASError> {
        let mut book_service = self.book_service.lock().unwrap();
        book_service.create(book).map_err(|_| BAASError::InvalidDto)
    }

    fn set_book_path(&self, book_id: i32, book_dir_rel_path: PathBuf) -> Result<Book, BAASError> {
        let mut book_service = self.book_service.lock().unwrap();
        book_service
            .update(
                book_id,
                UpdateBookDto {
                    path: Some(book_dir_rel_path.to_str().unwrap().to_string()),
                    title: None,
                    author_list: None,
                    timestamp: None,
                    pubdate: None,
                    series_index: None,
                    isbn: None,
                    lccn: None,
                    flags: None,
                    has_cover: None,
                },
            )
            .map_err(|_| BAASError::DatabaseBookWriteFailed)
    }

    fn add_book_files(
        &self,
        files: &Vec<NewLibraryFileDto>,
        book_title: &String,
        book_id: i32,
        primary_author_name: &String,
        book_dir_rel_path: PathBuf,
    ) -> Result<Vec<BookFile>, BAASError> {
        files
            .iter()
            .map(|file| {
                let book_file_name = gen_book_file_name(book_title, primary_author_name);

                let added_book = match self.book_file_service.lock() {
                    Ok(mut book_file_service_guard) => book_file_service_guard
                        .create(NewFileDto {
                            path: file.path.clone(),
                            book_id,
                            name: book_file_name,
                        })
                        .map_err(|_| BAASError::InvalidDto),
                    Err(_) => {
                        println!("Failed to acquire lock");
                        return Err(BAASError::DatabaseLocked);
                    }
                }?;

                let book_rel_path = Path::new(&book_dir_rel_path).join(&added_book.as_filename());
                match self.file_service.lock() {
                    Ok(file_service_guard) => file_service_guard
                        .copy_file_to_directory(file.path.as_path(), book_rel_path.as_path())
                        .map_err(|_| BAASError::InvalidDto),
                    Err(_) => {
                        println!("Failed to acquire lock");
                        return Err(BAASError::DatabaseLocked);
                    }
                };

                Ok(added_book)
            })
            .collect::<Result<Vec<BookFile>, BAASError>>()
    }

    fn metadata_opf_for_book_id(&mut self, id: i32, now: DateTime<Utc>) -> Result<String, ()> {
        // Get Book
        let mut book_service = self.book_service.lock().unwrap();
        let book = book_service.find_by_id(id).map_err(|_| ())?;
        let tags: Vec<String> = Vec::new();

        // Get Authors
        let author_ids = book_service
            .find_author_ids_by_book_id(id)
            .map_err(|_| ())?;
        // TODO: oh lord, fix this.
        let author_list = author_ids
            .iter()
            .map(|&author_id| {
                let mut author_service = self.author_service.lock().unwrap();
                author_service.find_by_id(author_id).map_err(|_| ())
            })
            .filter(|author| author.is_ok())
            .map(|author| author.unwrap())
            .filter(|author| author.is_some())
            .map(|author| author.unwrap())
            .collect::<Vec<Author>>();

        let book_custom_author_sort = book.author_sort.unwrap_or(
            author_list
                .iter()
                .map(|author| author.name.clone())
                .collect::<Vec<String>>()
                .join(", "),
        );

        let tags_string = tags
            .iter()
            .map(|tag| format!("<dc:subject>{}</dc:subject>", tag))
            .collect::<String>();
        let authors_string = author_list
            .iter()
            .map(|author| {
                format!(
                    "<dc:creator opf:file-as=\"{sortable}\" opf:role=\"aut\">{author}</dc:creator>",
                    sortable = book_custom_author_sort.as_str(),
                    author = author.name
                )
            })
            .collect::<String>();

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
            calibre_uuid = book.uuid.unwrap_or("".to_string()).as_str(),
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
            book_title_sortable = book.sort.unwrap_or("".to_string()).as_str()
        ))
    }
}
