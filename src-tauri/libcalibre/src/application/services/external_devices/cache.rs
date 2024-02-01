use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};

use serde::{de, Deserialize, Deserializer, Serialize, Serializer};
use serde_json::Value;

use crate::BookWithAuthorsAndFiles;

/// A book thumbnail image, including its dimensions.
#[derive(Debug, Clone)]
pub struct ThumbnailImage {
    width: i32,
    height: i32,
    data: String, // base64 encoded image
}
impl<'de> Deserialize<'de> for ThumbnailImage {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let arr = Vec::<Value>::deserialize(deserializer)?;

        let width = arr
            .get(0)
            .ok_or_else(|| de::Error::custom("Missing thumbnail width"))?
            .as_i64()
            .unwrap() as i32;
        let height = arr
            .get(1)
            .ok_or_else(|| de::Error::custom("Missing thumbnail height"))?
            .as_i64()
            .unwrap() as i32;
        let data = arr
            .get(2)
            .ok_or_else(|| de::Error::custom("Missing thumbnail image data"))?
            .as_str()
            .unwrap()
            .to_string();

        Ok(ThumbnailImage {
            width,
            height,
            data,
        })
    }
}
impl Serialize for ThumbnailImage {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let arr: Vec<Value> = vec![
            Value::Number(serde_json::Number::from(self.width)),
            Value::Number(serde_json::Number::from(self.height)),
            Value::String(self.data.clone()),
        ];
        arr.serialize(serializer)
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
pub enum SeriesIndex {
    Integer(i32),
    Float(f64),
}

/// Placeholder struct for user-defined metadata.
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct UserMetadata;

/// A cache of all the book data on an external device.
pub type ExternalCache = Vec<CacheItem>;
pub type ExternalCacheError = Box<dyn std::error::Error>;
/// Information about a single book on an external device.
#[derive(Debug, Serialize, Deserialize)]
pub struct CacheItem {
    pub title: String,
    pub authors: Vec<String>,
    pub application_id: i32,
    pub uuid: String,
    // Set by Calibre, but not used by Citadel.
    pub thumbnail: Option<ThumbnailImage>,
    pub publication_type: Option<String>,
    pub db_id: Option<i32>,
    pub series_index: Option<SeriesIndex>,
    pub pubdate: String,

    pub rights: Option<String>,
    pub book_producer: Option<String>,
    pub title_sort: Option<String>,
    pub timestamp: String,
    pub lpath: String,
    pub last_modified: String,
    pub tags: Vec<String>,
    pub size: i32,
    pub cover: Option<String>,
    pub link_maps: HashMap<String, serde_json::Value>,
    pub mime: Option<String>,
    pub languages: Vec<String>,
    pub identifiers: HashMap<String, String>,
    pub rating: Option<i32>,
    pub user_categories: HashMap<String, serde_json::Value>,
    pub author_sort_map: HashMap<String, String>,
    pub author_sort: String,
    pub series: Option<String>,
    pub publisher: Option<String>,
    pub comments: Option<String>,
    #[serde(skip_deserializing)]
    pub user_metadata: UserMetadata, // Skip deserializing as we don't know the type of the content of this user-defined field.
}
impl CacheItem {
    pub fn from_book(
        entry: &BookWithAuthorsAndFiles,
        rel_file_path: &Path,
    ) -> Result<Self, ExternalCacheError> {
        match entry.book.uuid.clone() {
            Some(uuid) => Ok(CacheItem::new(
                entry.book.id,
                uuid,
                &entry.book.title,
                entry.authors.iter().map(|a| a.name.clone()).collect(),
                rel_file_path,
            )),
            None => Err("Book has no UUID".into()),
        }
    }

    pub fn new(
        book_id: i32,
        book_uuid: String,
        title: &str,
        authors: Vec<String>,
        rel_file_path: &Path,
    ) -> Self {
        CacheItem {
            title: title.to_string(),
            authors,
            application_id: book_id,
            uuid: book_uuid,
            lpath: rel_file_path.to_str().unwrap().to_string(),
            // We're not populating these fields. Yet.
            thumbnail: None,
            publication_type: None,
            db_id: None,
            series_index: None,
            pubdate: "None".to_string(),
            rights: None,
            book_producer: None,
            user_metadata: UserMetadata::default(),
            title_sort: None,
            timestamp: "None".to_string(),
            last_modified: String::new(),
            tags: Vec::new(),
            size: 0,
            cover: None,
            link_maps: HashMap::new(),
            mime: None,
            languages: Vec::new(),
            identifiers: HashMap::new(),
            rating: None,
            user_categories: HashMap::new(),
            author_sort_map: HashMap::new(),
            author_sort: String::new(),
            series: None,
            publisher: None,
            comments: None,
        }
    }
}

const METADATA_FILENAME: &str = "metadata.calibre";
type InstallError = Box<dyn std::error::Error>;
/// A collection of books on an external device.
/// Calibre, when it adds books to this path, updates a cache with metadata about
/// the books.
pub struct ExternalLibrary {
    pub dir: PathBuf,
}

impl ExternalLibrary {
    pub fn list_items(&self) -> Vec<CacheItem> {
        let cache = std::fs::read_to_string(&self.dir.join(METADATA_FILENAME)).unwrap();
        let cache: ExternalCache = serde_json::from_str(&cache).unwrap();
        cache
    }

    pub fn add_item(
        &self,
        book: BookWithAuthorsAndFiles,
        file_index: usize,
        file_path: &Path,
    ) -> Result<(), InstallError> {
        let mut cache = self.list_items();
        let file = &book.files[file_index];
        let filename = file.as_filename();

        let author_path = self.create_folder_for_author(book.authors[0].name.clone())?;
        let file_path_on_drive = author_path.join(&filename);

        let item = CacheItem::from_book(&book, file_path_on_drive.as_path());
        match item {
            Err(_) => Err("Could not create cache item from book".into()),
            Ok(item) => {
                std::fs::copy(&file_path, file_path_on_drive)
                    .map_err(|_| "Could not copy file to library folder")?;
                cache.retain(|x| x.uuid != item.uuid);
                cache.push(item);

                // Serialize the cache & write it to disk
                let cache = serde_json::to_string(&cache)?;
                std::fs::write(&self.dir.join(METADATA_FILENAME), cache)?;
                Ok(())
            }
        }
    }

    fn create_folder_for_author(&self, author_name: String) -> Result<PathBuf, InstallError> {
        let apb = self.dir.join(&author_name);
        let author_path = apb.as_path();
        if !&author_path.exists() {
            match std::fs::create_dir(&author_path) {
                Ok(_) => Ok(author_path.to_path_buf()),
                Err(e) => Err(e.into()),
            }
        } else {
            Ok(author_path.to_path_buf())
        }
    }
}
