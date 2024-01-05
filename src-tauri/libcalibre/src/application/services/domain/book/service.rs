use crate::application::services::domain::book::dto::NewBookDto;
use crate::domain::book::entity::{Book, NewBook};
use crate::domain::book::repository::Repository as BookRepository;

pub struct BookService<Repo>
where
    Repo: BookRepository,
{
    book_repository: Repo,
}

impl<Repo> BookService<Repo>
where
    Repo: BookRepository,
{
    pub fn new(book_repository: Repo) -> Self {
        Self { book_repository }
    }

    pub fn create(&mut self, dto: NewBookDto) -> Result<Book, ()> {
        let book = NewBook::try_from(dto)?;
        let book = self.book_repository.create(&book)?;

        Ok(book)
    }
}
