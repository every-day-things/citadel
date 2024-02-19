use std::path::{Path, PathBuf};

use crate::book::ImportableBookType;

pub struct TxtMetadata {
    pub title: String,
    pub path: PathBuf,
}
impl TxtMetadata {
    pub fn to_importable_book_metadata(&self) -> super::ImportableBookMetadata {
        super::ImportableBookMetadata {
            title: self.title.clone(),
            file_type: ImportableBookType::Text,
            path: self.path.clone(),
            author_names: None,
            identifier: None,
            publisher: None,
            language: None,
            tags: vec![],
            publication_date: None,
            file_contains_cover: false,
        }
    }
}

pub fn read_metadata(path: &Path) -> Option<TxtMetadata> {
    let title = path.file_stem()?.to_str()?;

    Some(TxtMetadata {
        title: title.to_string(),
        path: path.to_path_buf(),
    })
}
