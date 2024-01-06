use std::error::Error;
use std::sync::{Arc, Mutex};

use crate::application::services::domain::file::dto::{NewFileDto, UpdateFileDto};
use crate::domain::file::entity::{File, NewFile, UpdateFile};
use crate::domain::file::repository::Repository as FileRepository;

pub struct FileService<Repo>
where
    Repo: FileRepository,
{
    file_repository: Arc<Mutex<Repo>>,
}

impl<Repo> FileService<Repo>
where
    Repo: FileRepository + 'static,
{
    pub fn new(file_repository: Arc<Mutex<Repo>>) -> Self {
        Self { file_repository }
    }

    pub fn create(&self, dto: NewFileDto) -> Result<File, Box<dyn Error>> {
        let new_file = NewFile::try_from(dto).map_err(|_| "File not valid for database")?;
        let mut file_repo_guard = self
            .file_repository
            .lock()
            .map_err(|_| "File repository cannot be used by this thread")?;
        let file = file_repo_guard
            .create(&new_file)
            .map_err(|_| "Failed to save file")?;

        Ok(file)
    }

    pub fn find_by_id(&self, id: i32) -> Result<File, Box<dyn Error>> {
        let mut file_repo_guard = self
            .file_repository
            .lock()
            .map_err(|_| "File repository cannot be used by this thread")?;

        file_repo_guard
            .find_by_id(id)
            .map_err(|_| "Could not find file".into())
    }

    pub fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<File>, Box<dyn Error>> {
        let mut file_repo_guard = self
            .file_repository
            .lock()
            .map_err(|_| "File repository cannot be used by this thread")?;

        file_repo_guard
            .find_all_for_book_id(book_id)
            .map_err(|_| "Could not find files".into())
    }

    pub fn update(&mut self, id: i32, dto: UpdateFileDto) -> Result<File, Box<dyn Error>> {
        let updatable = UpdateFile::try_from(dto).map_err(|_| "File not valid for database")?;
        let mut file_repo_guard = self
            .file_repository
            .lock()
            .map_err(|_| "File repository cannot be used by this thread")?;
        let file = file_repo_guard
            .update(id, &updatable)
            .map_err(|_| "Could not update file".into());

        file
    }
}
