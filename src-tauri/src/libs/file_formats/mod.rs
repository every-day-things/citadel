use epub::doc::EpubDoc;

pub struct EpubMetadata {
    pub title: Option<String>,
    pub creator: Option<String>,
    pub identifier: Option<String>,
    pub publisher: Option<String>,
    pub language: Option<String>,
    pub cover_image_data: Option<Vec<u8>>,
}

pub fn read_epub_metadata(path: String) -> EpubMetadata {
    let doc = EpubDoc::new(path);
    assert!(doc.is_ok());
    let mut doc = doc.unwrap();

    EpubMetadata {
        title: doc.mdata("title"),
        creator: doc.mdata("creator"),
        identifier: doc.mdata("identifier"),
        publisher: doc.mdata("publisher"),
        language: doc.mdata("language"),
        cover_image_data: doc.get_cover().map(|(data, id)| data),
    }
}
