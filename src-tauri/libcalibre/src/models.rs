use diesel::prelude::*;

use crate::entities::book::Book;

use super::schema::*;

#[derive(Queryable, Selectable, Identifiable, Insertable)]
#[diesel(table_name = authors)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Author {
    pub id: i32,
    pub name: String,
    pub sort: Option<String>,
    pub link: String,
}

#[derive(Identifiable, Associations, Queryable, Selectable, Insertable)]
#[diesel(belongs_to(Book, foreign_key = book))]
#[diesel(belongs_to(Author, foreign_key = author))]
#[diesel(table_name = books_authors_link)]
pub struct BookAuthorLink {
    pub id: Option<i32>,
    pub book: i32,
    pub author: i32,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = identifiers)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Identifier {
    pub id: i32,
    pub book: i32,
    pub type_: String,
    pub val: String,
}

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = annotations)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Annotation {
//     pub id: i32,
//     pub book: i32,
//     pub format: String,
//     pub user_type: String,
//     pub user: String,
//     pub timestamp: f32,
//     pub annot_id: String,
//     pub annot_type: String,
//     pub annot_data: String,
//     pub searchable_text: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = comments)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Comment {
//     pub id: i32,
//     pub book: i32,
//     pub text: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = conversion_options)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct ConversionOptions {
//     pub id: i32,
//     pub format: String,
//     pub book: Option<i32>,
//     pub data: Vec<u8>,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = custom_columns)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct CustomColumn {
//     pub id: i32,
//     pub label: String,
//     pub name: String,
//     pub datatype: String,
//     pub mark_for_delete: bool,
//     pub editable: bool,
//     pub display: String,
//     pub is_multiple: bool,
//     pub normalized: bool,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = feeds)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Feed {
//     pub id: i32,
//     pub title: String,
//     pub script: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = languages)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Language {
//     pub id: i32,
//     pub lang_code: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = last_read_positions)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct LastReadPosition {
//     pub id: i32,
//     pub book: i32,
//     pub format: String,
//     pub user: String,
//     pub device: String,
//     pub cfi: String,
//     pub epoch: f32,
//     pub pos_frac: f32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = library_id)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct LibraryID {
//     pub id: i32,
//     pub uuid: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = metadata_dirtied)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct MetadataDirtied {
//     pub id: i32,
//     pub book: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = preferences)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Preference {
//     pub id: i32,
//     pub key: String,
//     pub val: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = publishers)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Publisher {
//     pub id: i32,
//     pub name: String,
//     pub sort: Option<String>,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = ratings)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Rating {
//     pub id: i32,
//     pub rating: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = series)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Series {
//     pub id: i32,
//     pub name: String,
//     pub sort: Option<String>,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = tags)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct Tag {
//     pub id: i32,
//     pub name: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_languages_link)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookLanguageLink {
//     pub id: i32,
//     pub book: i32,
//     pub lang_code: i32,
//     pub item_order: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_plugin_data)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookPluginData {
//     pub id: i32,
//     pub book: i32,
//     pub name: String,
//     pub val: String,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_publishers_link)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookPublisherLink {
//     pub id: i32,
//     pub book: i32,
//     pub publisher: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_ratings_link)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookRatingLink {
//     pub id: i32,
//     pub book: i32,
//     pub rating: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_series_link)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookSeriesLink {
//     pub id: i32,
//     pub book: i32,
//     pub series: i32,
// }

// #[derive(Queryable, Selectable)]
// #[diesel(table_name = books_tags_link)]
// #[diesel(check_for_backend(diesel::sqlite::Sqlite))]
// pub struct BookTagLink {
//     pub id: i32,
//     pub book: i32,
//     pub tag: i32,
// }
