use std::{
    io::{Read, Seek},
    path::Path,
};

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

fn get_epub_cover<R: Read + Seek>(doc: &mut EpubDoc<R>) -> Option<Vec<u8>> {
    // Standard path (works for EPUB3 with properties="cover-image" on manifest item
    // and for EPUB2 style via epub crate's own fallback)
    if let Some((data, _)) = doc.get_cover() {
        return Some(data);
    }
    // Fallback for hybrid EPUB3 books that use EPUB2-style cover metadata
    // (<meta name="cover" content="manifest-item-id"/>) but epub crate's
    // get_cover() misses it (can happen with newer epub crate versions)
    let cover_id = doc.mdata("cover")?;
    doc.get_resource(&cover_id).map(|(data, _)| data)
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
                cover_image_data: get_epub_cover(&mut doc),
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
