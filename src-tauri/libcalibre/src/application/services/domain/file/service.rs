use std::error::Error;
use std::ffi::OsStr;
use std::path::Path;

use mobi::Mobi;

use crate::application::services::domain::file::dto::{NewFileDto, UpdateFileDto};
use crate::domain::book_file::entity::{BookFile, NewBookFile, UpdateBookFile};
use crate::domain::book_file::repository::Repository as BookFileRepository;
use crate::mime_type::MIMETYPE;

pub trait BookFileServiceTrait {
    fn new(file_repository: Box<dyn BookFileRepository>) -> Self;
    fn create(&mut self, dto: NewFileDto) -> Result<BookFile, Box<dyn Error>>;
    fn find_by_id(&mut self, id: i32) -> Result<BookFile, Box<dyn Error>>;
    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<BookFile>, Box<dyn Error>>;
    fn update(&mut self, id: i32, dto: UpdateFileDto) -> Result<BookFile, Box<dyn Error>>;
    fn cover_img_data_from_path(&mut self, path: &Path) -> Result<Option<Vec<u8>>, Box<dyn Error>>;
}

fn cover_data(path: &Path) -> Result<Option<Vec<u8>>, Box<dyn Error>> {
    let extension = path
        .extension()
        .and_then(OsStr::to_str)
        .ok_or("Failed to read file extension")?;

    match MIMETYPE::from_file_extension(extension) {
        Some(MIMETYPE::EPUB) => {
            let mut doc = epub::doc::EpubDoc::new(path)?;
            Ok(doc.get_cover().map(|(data, _id)| data))
        }
        Some(MIMETYPE::MOBI) => {
            let m = Mobi::from_path(&path);
            match m {
                Err(_) => Err("Failed to read mobi file")?,
                Ok(mobi) => {
                    let cover_data = mobi.image_records().last().map(|img| img.content.to_vec());
                    Ok(cover_data)
                }
            }
        }
        _ => Ok(None),
    }
}

pub struct BookFileService {
    file_repository: Box<dyn BookFileRepository>,
}

impl BookFileServiceTrait for BookFileService {
    fn new(file_repository: Box<dyn BookFileRepository>) -> Self {
        Self { file_repository }
    }

    fn create(&mut self, dto: NewFileDto) -> Result<BookFile, Box<dyn Error>> {
        let new_file = NewBookFile::try_from(dto).map_err(|_| "File not valid for database")?;
        let file = self
            .file_repository
            .create(&new_file)
            .map_err(|_| "Failed to save file")?;

        Ok(file)
    }

    fn find_by_id(&mut self, id: i32) -> Result<BookFile, Box<dyn Error>> {
        self.file_repository
            .find_by_id(id)
            .map_err(|_| "Could not find file".into())
    }

    fn find_all_for_book_id(&mut self, book_id: i32) -> Result<Vec<BookFile>, Box<dyn Error>> {
        self.file_repository
            .find_all_for_book_id(book_id)
            .map_err(|_| "Could not find files".into())
    }

    fn update(&mut self, id: i32, dto: UpdateFileDto) -> Result<BookFile, Box<dyn Error>> {
        let updatable = UpdateBookFile::try_from(dto).map_err(|_| "File not valid for database")?;
        self.file_repository
            .update(id, &updatable)
            .map_err(|_| "Could not update file".into())
    }

    fn cover_img_data_from_path(&mut self, path: &Path) -> Result<Option<Vec<u8>>, Box<dyn Error>> {
        cover_data(&path)
    }
}
