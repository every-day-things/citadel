use crate::application::services::domain::author::dto::{NewAuthorDto, UpdateAuthorDto};
use crate::domain::author::entity::{Author, NewAuthor, UpdateAuthorData};
use crate::domain::author::repository::Repository as AuthorRepository;

pub trait AuthorServiceTrait {
    fn new(author_repository: Box<dyn AuthorRepository>) -> Self;
    fn create(&mut self, dto: NewAuthorDto) -> Result<Author, ()>;
    fn find_by_id(&mut self, id: i32) -> Result<Author, ()>;
    fn all(&mut self) -> Result<Vec<Author>, ()>;
    fn update(&mut self, id: i32, dto: UpdateAuthorDto) -> Result<Author, ()>;
    fn name_author_dir(&mut self, author: &Author) -> String;
}

pub struct AuthorService {
    author_repository: Box<dyn AuthorRepository>,
}

impl AuthorServiceTrait for AuthorService {
    fn new(author_repository: Box<dyn AuthorRepository>) -> Self {
        Self { author_repository }
    }

    fn create(&mut self, dto: NewAuthorDto) -> Result<Author, ()> {
        let author = NewAuthor::try_from(dto)?;
        let author = self.author_repository.create(&author)?;

        Ok(author)
    }

    fn find_by_id(&mut self, id: i32) -> Result<Author, ()> {
        self.author_repository.find_by_id(id)
    }

    fn all(&mut self) -> Result<Vec<Author>, ()> {
        self.author_repository.all()
    }

    fn update(&mut self, id: i32, dto: UpdateAuthorDto) -> Result<Author, ()> {
        let updatable = UpdateAuthorData::try_from(dto)?;

        self.author_repository.update(id, &updatable)
    }

    fn name_author_dir(&mut self, author: &Author) -> String {
        self.author_repository.name_author_dir(author)
    }
}
