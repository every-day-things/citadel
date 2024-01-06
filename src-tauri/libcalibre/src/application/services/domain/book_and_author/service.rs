use crate::application::services::domain::author::dto::NewAuthorDto;
use crate::application::services::domain::book::dto::NewBookDto;
use crate::domain::author::entity::{NewAuthor, Author};
use crate::domain::author::repository::Repository as AuthorRepository;
use crate::domain::book::aggregate::BookWithAuthorsAndFiles;
use crate::domain::book::entity::NewBook;
use crate::domain::book::repository::Repository as BookRepository;

pub struct BookAndAuthorService<BR, AR>
where
    BR: BookRepository,
    AR: AuthorRepository,
{
    book_repository: BR,
    author_repository: AR,
}

impl<BR, AR> BookAndAuthorService<BR, AR>
where
    BR: BookRepository,
    AR: AuthorRepository,
{
    pub fn new(book_repository: BR, author_repository: AR) -> Self {
        Self {
            book_repository,
            author_repository,
        }
    }

    pub fn create(
        &mut self,
        book_dto: NewBookDto,
        author_dto_list: Vec<NewAuthorDto>,
    ) -> Result<BookWithAuthorsAndFiles, ()> {
        let book = NewBook::try_from(book_dto)?;
        let book = self.book_repository.create(&book)?;
        let author_list = author_dto_list
            .into_iter()
            .flat_map(|dto| {
                NewAuthor::try_from(dto)
                    .map(|author| self.author_repository.create(&author))
            })
            .collect::<Result<Vec<Author>, ()>>()?;

        // Link authors to book
        author_list.iter().for_each(|author| {
            let _ = self.book_repository
                .create_book_author_link(book.id, author.id);
        });

        Ok(BookWithAuthorsAndFiles {
            book,
            authors: author_list,
        })
    }

    pub fn find_book_with_authors(&mut self, id: i32) -> Result<BookWithAuthorsAndFiles, ()> {
        let book = self.book_repository.find_by_id(id)?;
        let author_ids_for_book = self.book_repository.find_author_ids_by_book_id(book.id)?;
        let authors = author_ids_for_book
            .iter()
            .map(|id| {
                self.author_repository
                    .find_by_id(*id)
                    .expect("Failed to find author")
            })
            .collect();

        Ok(BookWithAuthorsAndFiles { book, authors })
    }
}
