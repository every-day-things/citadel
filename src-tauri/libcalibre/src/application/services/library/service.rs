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

use super::dto::{NewLibraryEntryDto, NewLibraryFileDto, UpdateLibraryEntryDto};

#[derive(Debug)]
pub enum LibSrvcError {
    InvalidDto,
    DatabaseBookWriteFailed,
    DatabaseAuthorWriteFailed,
    BookAuthorLinkFailed,
    DatabaseLocked,
    NotFoundBookFiles,
    NotFoundBook,
    NotFoundAuthor,
}

impl std::fmt::Display for LibSrvcError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}

impl std::error::Error for LibSrvcError {}

pub fn gen_book_folder_name(book_name: &String, book_id: i32) -> String {
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
        let author_list = self.create_authors(dto.authors)?;
        let book = self.create_book(dto.book.clone(), &author_list)?;
        let primary_author = &author_list[0];

        for author in &author_list {
            let mut book_service = self
                .book_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?;
            book_service
                .link_book_to_author(book.id, author.id)
                .map_err(|_| LibSrvcError::BookAuthorLinkFailed)?;
        }

        // 2. Create Directories for Author & Book
        // ======================================
        let author_dir_name = {
            let mut author_service = self
                .author_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?;
            author_service.name_author_dir(primary_author)
        };

        let book_dir_name = gen_book_folder_name(&dto.book.title, book.id);
        let book_dir_relative_path = Path::new(&author_dir_name).join(&book_dir_name);

        {
            let file_service = self
                .file_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?;
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
                &dto.book.title,
                book.id,
                &primary_author.name,
                book_dir_relative_path.clone(),
            );
            if let Ok(files) = result {
                created_files = files;
            }

            // If a Cover Image exists, copy it to library
            let primary_file = &files[0];
            {
                let mut bfs = self
                    .book_file_service
                    .lock()
                    .map_err(|_| LibSrvcError::DatabaseLocked)?;
                let fs = self
                    .file_service
                    .lock()
                    .map_err(|_| LibSrvcError::DatabaseLocked)?;

                let cover_data = bfs.cover_img_data_from_path(primary_file.path.as_path())?;
                if let Some(cover_data) = cover_data {
                    let cover_path = Path::new(&book_dir_relative_path).join("cover.jpg");
                    let _ = fs.write_to_file(&cover_path, cover_data);
                }
            }
        }

        // 4. Create Calibre metadata file
        // ===============================
        let metadata_opf_contents = self.metadata_opf_for_book_id(book.id, Utc::now());
        if let Ok(contents) = metadata_opf_contents {
            let metadata_opf_path = Path::new(&book_dir_relative_path).join("metadata.opf");
            let _ = self
                .file_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?
                .write_to_file(&metadata_opf_path, contents.as_bytes().to_vec());
        }

        Ok(BookWithAuthorsAndFiles {
            book,
            authors: author_list,
            files: created_files,
        })
    }

    pub fn find_book_with_authors(
        &mut self,
        id: i32,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        let mut book_service = self
            .book_service
            .lock()
            .map_err(|_| LibSrvcError::DatabaseLocked)?;
        let book = book_service
            .find_by_id(id)
            .map_err(|_| LibSrvcError::NotFoundBook)?;

        let author_ids = book_service
            .find_author_ids_by_book_id(id)
            .map_err(|_| LibSrvcError::NotFoundAuthor)?;

        let authors: Vec<Author> = author_ids
            .into_iter()
            .map(|author_id| {
                let mut author_service = self
                    .author_service
                    .lock()
                    .map_err(|_| LibSrvcError::DatabaseLocked)?;
                match author_service.find_by_id(author_id) {
                    Ok(Some(author)) => Ok(author),
                    _ => Err(LibSrvcError::NotFoundAuthor),
                }
            })
            .map(|item| item.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        let mut file_repo_guard = self
            .book_file_service
            .lock()
            .map_err(|_| LibSrvcError::DatabaseLocked)?;
        let files = file_repo_guard
            .find_all_for_book_id(book.id)
            .map_err(|_| LibSrvcError::NotFoundBookFiles)?;

        Ok(BookWithAuthorsAndFiles {
            book,
            authors,
            files,
        })
    }

    pub fn find_all(&mut self) -> Result<Vec<BookWithAuthorsAndFiles>, Box<dyn Error>> {
        let mut book_service = self
            .book_service
            .lock()
            .map_err(|_| LibSrvcError::DatabaseLocked)?;
        let books = book_service
            .all()
            .map_err(|_| LibSrvcError::DatabaseBookWriteFailed)?;

        let mut book_list = Vec::new();
        for book in books {
            let author_ids = book_service
                .find_author_ids_by_book_id(book.id)
                .map_err(|_| LibSrvcError::NotFoundAuthor)?;

            let authors: Vec<Author> = author_ids
                .into_iter()
                .map(|author_id| {
                    let mut author_service = self
                        .author_service
                        .lock()
                        .map_err(|_| LibSrvcError::DatabaseLocked)?;
                    match author_service.find_by_id(author_id) {
                        Ok(Some(author)) => Ok(author),
                        _ => Err(LibSrvcError::NotFoundAuthor),
                    }
                })
                .map(|item| item.map_err(|e| e.into()))
                .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

            let mut file_repo_guard = self
                .book_file_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?;
            let files = file_repo_guard
                .find_all_for_book_id(book.id)
                .map_err(|_| LibSrvcError::NotFoundBookFiles)?;

            book_list.push(BookWithAuthorsAndFiles {
                book,
                authors,
                files,
            });
        }

        Ok(book_list)
    }

    pub fn update(
        &mut self,
        book_id: i32,
        dto: UpdateLibraryEntryDto,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        {
            let mut book_service = self
                .book_service
                .lock()
                .map_err(|_| LibSrvcError::DatabaseLocked)?;
            let _ = book_service
                .update(book_id, dto.book)
                .map_err(|_| LibSrvcError::DatabaseBookWriteFailed);

            let authors = book_service
                .find_author_ids_by_book_id(book_id)
                .map_err(|_| LibSrvcError::NotFoundBook)?;
            authors
                .iter()
                .map(|&author_id| {
                    book_service
                        .unlink_book_from_author(book_id, author_id)
                        .map_err(|_| LibSrvcError::BookAuthorLinkFailed)
                })
                .collect::<Result<(), LibSrvcError>>()?;

            match dto.author_id_list {
                Some(author_id_list) => {
                    author_id_list
                        .iter()
                        .map(|author_id| {
                            let author_id_int = author_id.parse::<i32>().unwrap();
                            book_service
                                .link_book_to_author(book_id, author_id_int)
                                .map_err(|_| LibSrvcError::BookAuthorLinkFailed)
                        })
                        .collect::<Result<(), LibSrvcError>>()?;
                }
                None => {}
            }
        }

        self.find_book_with_authors(book_id)
    }

    fn create_authors(
        &mut self,
        authors: Vec<NewAuthorDto>,
    ) -> Result<Vec<Author>, Box<dyn Error>> {
        let author_list = authors
            .into_iter()
            .map(|dto| {
                let mut author_service = self
                    .author_service
                    .lock()
                    .map_err(|_| LibSrvcError::DatabaseLocked)?;
                author_service
                    .create(dto)
                    .map_err(|_| LibSrvcError::DatabaseAuthorWriteFailed)
            })
            .map(|res| res.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        Ok(author_list)
    }

    fn create_book(
        &self,
        book: NewBookDto,
        author_list: &Vec<Author>,
    ) -> Result<Book, LibSrvcError> {
        let mut book_service = self
            .book_service
            .lock()
            .map_err(|_| LibSrvcError::DatabaseLocked)?;
        let combined_authort_sort = author_list
            .iter()
            .map(|author| author.sortable_name())
            .collect::<Vec<String>>()
            .join(" & ");
        println!("authors: {:?}", author_list);
        println!("combined_authort_sort: {}", combined_authort_sort);
        let added_book = book_service
            .create(book)
            .map_err(|_| LibSrvcError::InvalidDto);

        if let Ok(book) = &added_book {
            book_service
                .update(
                    book.id,
                    UpdateBookDto {
                        author_sort: Some(combined_authort_sort),
                        title: None,
                        timestamp: None,
                        pubdate: None,
                        series_index: None,
                        isbn: None,
                        lccn: None,
                        path: None,
                        flags: None,
                        has_cover: None,
                    },
                )
                .map_err(|_| LibSrvcError::InvalidDto)?;
        };

        added_book
    }

    fn set_book_path(
        &self,
        book_id: i32,
        book_dir_rel_path: PathBuf,
    ) -> Result<Book, LibSrvcError> {
        let mut book_service = self
            .book_service
            .lock()
            .map_err(|_| LibSrvcError::DatabaseLocked)?;
        book_service
            .update(
                book_id,
                UpdateBookDto {
                    path: Some(book_dir_rel_path.to_str().unwrap().to_string()),
                    title: None,
                    author_sort: None,
                    timestamp: None,
                    pubdate: None,
                    series_index: None,
                    isbn: None,
                    lccn: None,
                    flags: None,
                    has_cover: None,
                },
            )
            .map_err(|_| LibSrvcError::DatabaseBookWriteFailed)
    }

    fn add_book_files(
        &self,
        files: &Vec<NewLibraryFileDto>,
        book_title: &String,
        book_id: i32,
        primary_author_name: &String,
        book_dir_rel_path: PathBuf,
    ) -> Result<Vec<BookFile>, LibSrvcError> {
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
                        .map_err(|_| LibSrvcError::InvalidDto),
                    Err(_) => {
                        return Err(LibSrvcError::DatabaseLocked);
                    }
                }?;

                let book_rel_path = Path::new(&book_dir_rel_path).join(&added_book.as_filename());
                let _ = match self.file_service.lock() {
                    Ok(file_service_guard) => file_service_guard
                        .copy_file_to_directory(file.path.as_path(), book_rel_path.as_path())
                        .map_err(|_| LibSrvcError::InvalidDto),
                    Err(_) => {
                        return Err(LibSrvcError::DatabaseLocked);
                    }
                };

                Ok(added_book)
            })
            .collect::<Result<Vec<BookFile>, LibSrvcError>>()
    }

    fn metadata_opf_for_book_id(&mut self, id: i32, now: DateTime<Utc>) -> Result<String, ()> {
        let mut book_service = self.book_service.lock().map_err(|_| ())?;
        let book = book_service.find_by_id(id).map_err(|_| ())?;

        let author_ids = book_service
            .find_author_ids_by_book_id(id)
            .map_err(|_| ())?;
        let author_list = self.get_author_list(author_ids)?;

        let book_custom_author_sort = book
            .author_sort
            .clone()
            .unwrap_or_else(|| self.get_author_sort_string(&author_list));

        let tags_string = self.get_tags_string(Vec::new());
        let authors_string = self.get_authors_string(&author_list, &book_custom_author_sort);

        Ok(self.format_metadata_opf(&book, &authors_string, &tags_string, &now))
    }

    fn get_author_list(&self, author_ids: Vec<i32>) -> Result<Vec<Author>, ()> {
        let mut author_service = self.author_service.lock().map_err(|_| ())?;
        let mut author_list = Vec::new();
        for author_id in author_ids {
            match author_service.find_by_id(author_id) {
                Ok(Some(author)) => author_list.push(author),
                _ => return Err(()),
            }
        }
        Ok(author_list)
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
