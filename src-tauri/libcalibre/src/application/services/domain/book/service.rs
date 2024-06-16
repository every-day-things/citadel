use crate::application::services::domain::book::dto::{NewBookDto, UpdateBookDto};
use crate::domain::book::entity::{Book, NewBook, UpdateBookData};
use crate::domain::book::repository::Repository as BookRepository;
use crate::models::Identifier;

pub trait BookServiceTrait {
    fn new(book_repository: Box<dyn BookRepository>) -> Self;
    fn create(&mut self, dto: NewBookDto) -> Result<Book, ()>;
    fn find_by_id(&mut self, id: i32) -> Result<Book, ()>;
    fn all(&mut self) -> Result<Vec<Book>, ()>;
    fn update(&mut self, id: i32, dto: UpdateBookDto) -> Result<Book, ()>;
    fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()>;
    fn link_book_to_author(&mut self, book_id: i32, author_id: i32) -> Result<(), ()>;
    fn unlink_book_from_author(&mut self, book_id: i32, author_id: i32) -> Result<(), ()>;
    fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()>;
}

pub struct BookService {
    book_repository: Box<dyn BookRepository>,
}

impl BookServiceTrait for BookService {
    fn new(book_repository: Box<dyn BookRepository>) -> Self {
        Self { book_repository }
    }

    fn create(&mut self, dto: NewBookDto) -> Result<Book, ()> {
        let book = NewBook::try_from(dto)?;
        let book = self.book_repository.create(&book)?;

        Ok(book)
    }

    fn find_by_id(&mut self, id: i32) -> Result<Book, ()> {
        self.book_repository.find_by_id(id)
    }

    fn all(&mut self) -> Result<Vec<Book>, ()> {
        self.book_repository.all()
    }

    fn update(&mut self, id: i32, dto: UpdateBookDto) -> Result<Book, ()> {
        let updatable = UpdateBookData::try_from(dto)?;

        self.book_repository.update(id, &updatable)
    }

    fn find_author_ids_by_book_id(&mut self, book_id: i32) -> Result<Vec<i32>, ()> {
        self.book_repository.find_author_ids_by_book_id(book_id)
    }

    fn link_book_to_author(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        self.book_repository
            .create_book_author_link(book_id, author_id)
    }

    fn unlink_book_from_author(&mut self, book_id: i32, author_id: i32) -> Result<(), ()> {
        self.book_repository
            .remove_book_author_link(book_id, author_id)
    }

    fn list_identifiers_for_book(&mut self, book_id: i32) -> Result<Vec<Identifier>, ()> {
        self.book_repository.list_identifiers_for_book(book_id)
    }
}
