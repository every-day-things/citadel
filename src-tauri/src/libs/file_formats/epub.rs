use std::path::Path;

use epub::doc::EpubDoc;

pub struct EpubMetadata {
    pub title: Option<String>,
    pub creator_list: Option<Vec<String>>,
    pub identifier: Option<String>,
    pub publisher: Option<String>,
    pub publication_date: Option<String>,
    pub language: Option<String>,
    pub cover_image_data: Option<Vec<u8>>,
    pub subjects: Vec<String>,
}

pub fn read_metadata(path: &Path) -> Option<EpubMetadata> {
    match EpubDoc::new(path) {
        Err(_) => None,
        Ok(mut doc) => {
            let creators = doc
                .metadata
                .get("creator")
                .map(|v| v.to_vec())
                .unwrap_or(Vec::new());

            Some(EpubMetadata {
                title: doc.mdata("title"),
                creator_list: Some(creators),
                identifier: doc.mdata("identifier"),
                publisher: doc.mdata("publisher"),
                language: doc.mdata("language"),
                cover_image_data: doc.get_cover().map(|(data, _id)| data),
                publication_date: doc.mdata("date"),
                subjects: doc
                    .metadata
                    .get("subject")
                    .map(|v| v.to_vec())
                    .unwrap_or(Vec::new()),
            })
        }
    }
}
