use std::{fs::File, path::PathBuf};

use crate::{
    entities::book_file::{NewBookFile, UpdateBookFile},
    mime_type::MIMETYPE,
};

pub struct NewFileDto {
    pub book_id: i32,
    pub path: PathBuf,
    pub name: String,
}

pub struct UpdateFileDto {
    pub book_id: Option<i32>,
    pub file_format: Option<String>,
    pub file_size_bytes: Option<i32>,
    pub name_without_extension: Option<String>,
}

impl TryFrom<NewFileDto> for NewBookFile {
    type Error = ();

    fn try_from(dto: NewFileDto) -> Result<Self, Self::Error> {
        match dto.path.exists() {
            true => {
                let file = File::open(&dto.path).unwrap();
                let size_bytes = file.metadata().unwrap().len() as i32;
                let ext = match dto.path.extension() {
                    Some(ext) => ext.to_str().unwrap_or(""),
                    None => "",
                };
                let format = MIMETYPE::from_file_extension(ext).ok_or(())?;

                Ok(Self {
                    book: dto.book_id,
                    format: format.to_file_extension().to_uppercase(),
                    uncompressed_size: size_bytes,
                    name: dto.name,
                })
            }
            false => Err(()),
        }
    }
}

impl TryFrom<UpdateFileDto> for UpdateBookFile {
    type Error = ();

    fn try_from(dto: UpdateFileDto) -> Result<Self, Self::Error> {
        Ok(Self {
            book: dto.book_id,
            format: dto.file_format,
            uncompressed_size: dto.file_size_bytes,
            name: dto.name_without_extension,
        })
    }
}
