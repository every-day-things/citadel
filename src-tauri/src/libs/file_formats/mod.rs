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

pub fn cover_data(path: &Path) -> Option<Vec<u8>> {
    let doc = EpubDoc::new(path);
    assert!(doc.is_ok());
    let mut doc = doc.unwrap();

    doc.get_cover().map(|(data, _id)| data)
}

pub fn read_epub_metadata(path: &Path) -> EpubMetadata {
    let doc = EpubDoc::new(path);
    assert!(doc.is_ok());
    let mut doc = doc.unwrap();
    let creators = doc.metadata.get("creator").map(|v| v.to_vec()).unwrap_or(Vec::new());

    EpubMetadata {
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
    }
}
