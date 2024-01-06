use crate::application::services::domain::author::dto::{NewAuthorDto, UpdateAuthorDto};
use crate::domain::author::entity::{Author, NewAuthor, UpdateAuthorData};
use crate::domain::author::repository::Repository as AuthorRepository;

pub struct AuthorService<Repo>
where
    Repo: AuthorRepository,
{
    author_repository: Repo,
}

impl<Repo> AuthorService<Repo>
where
    Repo: AuthorRepository,
{
    pub fn new(author_repository: Repo) -> Self {
        Self { author_repository }
    }

    pub fn create(&mut self, dto: NewAuthorDto) -> Result<Author, ()> {
        let author = NewAuthor::try_from(dto)?;
        let author = self.author_repository.create(&author)?;

        Ok(author)
    }

    pub fn find_by_id(&mut self, id: i32) -> Result<Author, ()> {
        self.author_repository.find_by_id(id)
    }

    pub fn all(&mut self) -> Result<Vec<Author>, ()> {
        self.author_repository.all()
    }

    pub fn update(&mut self, id: i32, dto: UpdateAuthorDto) -> Result<Author, ()> {
        let updatable = UpdateAuthorData::try_from(dto)?;
        let author = self.author_repository.update(id, &updatable);

        author
    }
}
