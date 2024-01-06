use crate::application::services::domain::file::dto::{NewFileDto, UpdateFileDto};
use crate::domain::file::entity::{File, NewFile, UpdateFile};
use crate::domain::file::repository::Repository as FileRepository;

pub struct FileService<Repo>
where
    Repo: FileRepository,
{
    file_repository: Repo,
}

impl<Repo> FileService<Repo>
where
    Repo: FileRepository,
{
    pub fn new(file_repository: Repo) -> Self {
        Self { file_repository }
    }

    pub fn create(&mut self, dto: NewFileDto) -> Result<File, ()> {
        let file = NewFile::try_from(dto)?;
        let file = self.file_repository.create(&file)?;

        Ok(file)
    }

    pub fn find_by_id(&mut self, id: i32) -> Result<File, ()> {
        self.file_repository.find_by_id(id)
    }

    pub fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<File>, ()> {
        self.file_repository.find_all_for_book_id(book_id)
    }

    pub fn update(&mut self, id: i32, dto: UpdateFileDto) -> Result<File, ()> {
        let updatable = UpdateFile::try_from(dto)?;
        let file = self.file_repository.update(id, &updatable);

        file
    }
}
