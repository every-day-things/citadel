use std::{
    error::Error,
    ffi::OsStr,
    io::{Read, Seek},
    path::Path,
};

use mobi::Mobi;

use crate::mime_type::MIMETYPE;

fn get_epub_cover<R: Read + Seek>(doc: &mut epub::doc::EpubDoc<R>) -> Option<Vec<u8>> {
    if let Some((data, _)) = doc.get_cover() {
        return Some(data);
    }
    let cover_id = doc.mdata("cover")?;
    doc.get_resource(&cover_id).map(|(data, _)| data)
}

pub fn cover_image_data_from_path(path: &Path) -> Result<Option<Vec<u8>>, Box<dyn Error>> {
    let extension = path
        .extension()
        .and_then(OsStr::to_str)
        .ok_or("Failed to read file extension")?;

    match MIMETYPE::from_file_extension(extension) {
        Some(MIMETYPE::EPUB) => {
            let mut doc = epub::doc::EpubDoc::new(path)?;
            Ok(get_epub_cover(&mut doc))
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
