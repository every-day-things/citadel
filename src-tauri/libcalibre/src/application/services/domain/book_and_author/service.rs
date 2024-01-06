use std::error::Error;
use std::result::Result;
use std::sync::{Arc, Mutex};

use crate::application::services::domain::author::dto::NewAuthorDto;
use crate::application::services::domain::book::dto::NewBookDto;
use crate::domain::author::entity::{Author, NewAuthor};
use crate::domain::author::repository::Repository as AuthorRepository;
use crate::domain::book::aggregate::BookWithAuthorsAndFiles;
use crate::domain::book::entity::NewBook;
use crate::domain::book::repository::Repository as BookRepository;
use crate::domain::file::repository::Repository as FileRepository;

pub struct BookAndAuthorService<BR, AR, FR>
where
    BR: BookRepository,
    AR: AuthorRepository,
    FR: FileRepository,
{
    book_repository: Arc<Mutex<BR>>,
    author_repository: Arc<Mutex<AR>>,
    file_repository: Arc<Mutex<FR>>,
}

impl<BR, AR, FR> BookAndAuthorService<BR, AR, FR>
where
    BR: BookRepository + 'static,
    AR: AuthorRepository + 'static,
    FR: FileRepository + 'static,
{
    pub fn new(
        book_repository: Arc<Mutex<BR>>,
        author_repository: Arc<Mutex<AR>>,
        file_repository: Arc<Mutex<FR>>,
    ) -> Self {
        Self {
            book_repository,
            author_repository,
            file_repository,
        }
    }

    pub fn create(
        &self,
        book_dto: NewBookDto,
        author_dto_list: Vec<NewAuthorDto>,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        let new_book = NewBook::try_from(book_dto).map_err(|_| "Book not valid for database")?;
        let mut book_repo_guard = self
            .book_repository
            .lock()
            .map_err(|_| "Book Repository cannot be used by this thread")?;
        let book = book_repo_guard
            .create(&new_book)
            .map_err(|_| "Database failed to create book")?;

        let author_list = author_dto_list
            .into_iter()
            .map(|dto| {
                let new_author = NewAuthor::try_from(dto).map_err(|_| "Failed to create author")?;
                let mut author_repo_guard = self
                    .author_repository
                    .lock()
                    .map_err(|_| "Author Repository cannot be used by this thread")?;
                author_repo_guard
                    .create(&new_author)
                    .map_err(|_| "Database failed to create author")
            })
            .map(|res| res.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        // Link authors to book
        for author in &author_list {
            book_repo_guard
                .create_book_author_link(book.id, author.id)
                .map_err(|_| "Could not link Author & Book")?;
        }

        let files = {
            let mut file_repo_guard = self
                .file_repository
                .lock()
                .map_err(|_| "File Repository cannot be used by this thread")?;

            file_repo_guard
                .find_all_for_book_id(book.id)
                .map_err(|_| "Could not read database to find files for book")?
        };

        Ok(BookWithAuthorsAndFiles {
            book,
            authors: author_list,
            files,
        })
    }

    pub fn find_book_with_authors(
        &mut self,
        id: i32,
    ) -> Result<BookWithAuthorsAndFiles, Box<dyn Error>> {
        let mut book_repo_guard = self
            .book_repository
            .lock()
            .map_err(|_| "Book Repository cannot be used by this thread")?;
        let book = book_repo_guard
            .find_by_id(id)
            .map_err(|_| "Book not found")?;

        let author_ids = book_repo_guard
            .find_author_ids_by_book_id(id)
            .map_err(|_| "Author not found")?;

        let authors: Vec<Author> = author_ids
            .into_iter()
            .map(|author_id| {
                let mut author_repo_guard = self
                    .author_repository
                    .lock()
                    .map_err(|_| "Author Repository cannot be used by this thread")?;
                author_repo_guard
                    .find_by_id(author_id)
                    .map_err(|_| "Author not found")
            })
            .map(|item| item.map_err(|e| e.into()))
            .collect::<Result<Vec<Author>, Box<dyn Error>>>()?;

        let mut file_repo_guard = self
            .file_repository
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
}
