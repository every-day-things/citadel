use std::error::Error;
use std::sync::Arc;
use std::sync::Mutex;

use diesel::RunQueryDsl;

use crate::application::services::domain::author::service::AuthorService;
use crate::application::services::domain::author::service::AuthorServiceTrait;
use crate::application::services::domain::book::service::BookService;
use crate::application::services::domain::book::service::BookServiceTrait;
use crate::application::services::domain::file::service::BookFileService;
use crate::application::services::domain::file::service::BookFileServiceTrait;
use crate::application::services::library::dto::NewLibraryEntryDto;
use crate::application::services::library::dto::UpdateLibraryEntryDto;
use crate::application::services::library::service::LibSrvcError;
use crate::application::services::library::service::LibraryService;
use crate::domain::book::entity::UpdateBookData;
use crate::infrastructure::domain::author::repository::AuthorRepository;
use crate::infrastructure::domain::book::repository::BookRepository;
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
        let mut library_service = self.get_mut_library_service();
        library_service.create(dto)
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
                    let _ = self.client_v2
                        .books()
                        .unlink_author_from_book(book_id, author_id);
                });

                // Link requested authors to book
                author_id_list.iter().for_each(|author_id| {
                    let author_id_int = author_id.parse::<i32>().unwrap();
                    let _ = self.client_v2
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
                    _ => Err(LibSrvcError::NotFoundAuthor),
                }
            })
            .map(|item| item.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        let database_path = self.validated_library_path.database_path.clone();
        let book_file_repo = Box::new(BookFileRepository::new(&database_path));
        let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
        let mut file_repo_guard = book_file_service
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

    fn get_mut_library_service(
        &mut self,
    ) -> LibraryService<BookService, AuthorService, FileService, BookFileService> {
        let database_path = self.validated_library_path.database_path.clone();

        let book_repo = Box::new(BookRepository::new(&database_path));
        let author_repo = Box::new(AuthorRepository::new(&database_path));
        let book_file_repo = Box::new(BookFileRepository::new(&database_path));

        let book_service = Arc::new(Mutex::new(BookService::new(book_repo)));
        let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));
        let book_file_service = Arc::new(Mutex::new(BookFileService::new(book_file_repo)));
        let file_service = Arc::new(Mutex::new(FileService::new(
            &self.validated_library_path.library_path,
        )));

        LibraryService::new(
            book_service,
            author_service,
            file_service,
            book_file_service,
        )
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
