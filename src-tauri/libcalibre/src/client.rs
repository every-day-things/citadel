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
use crate::application::services::library::service::LibraryService;
use crate::infrastructure::domain::author::repository::AuthorRepository;
use crate::infrastructure::domain::book::repository::BookRepository;
use crate::infrastructure::domain::book_file::repository::BookFileRepository;
use crate::infrastructure::file_service::FileService;
use crate::infrastructure::file_service::FileServiceTrait;
use crate::persistence::establish_connection;
use crate::util::ValidDbPath;

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
}

impl CalibreClient {
    pub fn new(db_path: ValidDbPath) -> CalibreClient {
        CalibreClient {
            validated_library_path: db_path,
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
        let mut library_service = self.get_mut_library_service();
        library_service.update(book_id, updates)
    }

    pub fn find_book_with_authors(
        &mut self,
        book_id: i32,
    ) -> Result<crate::BookWithAuthorsAndFiles, Box<dyn std::error::Error>> {
        let mut library_service = self.get_mut_library_service();
        library_service.find_book_with_authors(book_id)
    }

    pub fn find_all(
        &mut self,
    ) -> Result<Vec<crate::BookWithAuthorsAndFiles>, Box<dyn std::error::Error>> {
        let mut library_service = self.get_mut_library_service();
        library_service.find_all()
    }

    pub fn list_all_authors(&mut self) -> Result<Vec<crate::Author>, Box<dyn std::error::Error>> {
        let author_repo = Box::new(AuthorRepository::new(
            &self.validated_library_path.database_path,
        ));
        let author_service = Arc::new(Mutex::new(AuthorService::new(author_repo)));

        author_service
            .lock()
            .map(|mut locked_as| match locked_as.all() {
                Ok(authors) => authors,
                Err(_) => vec![],
            })
            .map_err(|_| Box::new(CalibreError::DatabaseError) as Box<dyn std::error::Error>)
    }

    pub fn list_identifiers_for_book(
        &mut self,
        book_id: i32,
    ) -> Result<Vec<(String, String)>, Box<dyn std::error::Error>> {
        let book_repo = Box::new(BookRepository::new(
            &self.validated_library_path.database_path,
        ));
        let book_service = Arc::new(Mutex::new(BookService::new(book_repo)));

        book_service
            .lock()
            .map(
                |mut locked_bs| match locked_bs.list_identifiers_for_book(book_id) {
                    Ok(identifiers) => identifiers,
                    Err(_) => vec![],
                },
            )
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
