use crate::application::services::domain::book::dto::{NewBookDto, UpdateBookDto};
use crate::domain::book::entity::{Book, NewBook, UpdateBookData};
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

    pub fn find_by_id(&mut self, id: i32) -> Result<Book, ()> {
        self.book_repository.find_by_id(id)
    }

    pub fn all(&mut self) -> Result<Vec<Book>, ()> {
        self.book_repository.all()
    }

    pub fn update(&mut self, id: i32, dto: UpdateBookDto) -> Result<Book, ()> {
        let updatable = UpdateBookData::try_from(dto)?;
        let book = self.book_repository.update(id, &updatable);

        book
    }
}
