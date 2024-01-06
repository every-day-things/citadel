use crate::domain::file::entity::{NewFile, UpdateFile};

pub struct NewFileDto {
    pub book_id: i32,
    // TODO: Convert this to an Enum of MIME types
    pub file_format: String,
    /// File sizes must be positive numbers. i32 type is required by SQLite.
    pub file_size_bytes: i32,
    /// The name of the file on disk, without the file extension
    pub name_without_extension: String
}

pub struct UpdateFileDto {
    pub book_id: Option<i32>,
    pub file_format: Option<String>,
    pub file_size_bytes: Option<i32>,
    pub name_without_extension: Option<String>,
}

impl TryFrom<NewFileDto> for NewFile {
    type Error = ();

    fn try_from(dto: NewFileDto) -> Result<Self, Self::Error> {
        Ok(Self {
            book: dto.book_id,
            format: dto.file_format,
            uncompressed_size: dto.file_size_bytes,
            name: dto.name_without_extension
        })
    }
}

impl TryFrom<UpdateFileDto> for UpdateFile {
    type Error = ();

    fn try_from(dto: UpdateFileDto) -> Result<Self, Self::Error> {
        Ok(Self {
            book: dto.book_id,
            format: dto.file_format,
            uncompressed_size: dto.file_size_bytes,
            name: dto.name_without_extension
        })
    }
}
