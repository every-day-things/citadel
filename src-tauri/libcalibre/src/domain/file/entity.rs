use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
use serde::Deserialize;

use crate::schema::data;

#[derive(Clone, Debug, Queryable, Selectable, Identifiable, AsChangeset)]
#[diesel(table_name = data)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct File {
    pub id: i32,
    pub book: i32,
    pub format: String,
    pub uncompressed_size: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = data)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewFile {
    pub book: i32,
    pub format: String,
    pub uncompressed_size: i32,
    pub name: String,
}

#[derive(Deserialize, AsChangeset, Default, Debug)]
#[diesel(table_name = data)]
pub struct UpdateFile {
    pub(crate) book: Option<i32>,
    pub(crate) format: Option<String>,
    pub(crate) uncompressed_size: Option<i32>,
    pub(crate) name: Option<String>,
}
