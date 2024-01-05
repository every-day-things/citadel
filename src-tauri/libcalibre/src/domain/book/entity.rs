use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
use serde::Deserialize;

use crate::schema::books;

#[derive(Clone, Debug, Queryable, Selectable, Identifiable, AsChangeset)]
#[diesel(table_name = books)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Book {
    pub id: i32,
    pub uuid: Option<String>,
    pub title: String,
    pub sort: Option<String>,
    pub timestamp: Option<NaiveDateTime>,
    pub pubdate: Option<NaiveDateTime>,
    pub series_index: f32,
    pub author_sort: Option<String>,
    pub isbn: Option<String>,
    pub lccn: Option<String>,
    pub path: String,
    pub flags: i32,
    pub has_cover: Option<bool>,
    pub last_modified: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = books)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewBook {
    pub title: String,
    pub timestamp: Option<NaiveDateTime>,
    pub pubdate: Option<NaiveDateTime>,
    pub series_index: f32,
    pub isbn: Option<String>,
    pub lccn: Option<String>,
    pub flags: i32,
    pub has_cover: Option<bool>,
}

#[derive(Deserialize, AsChangeset, Default, Debug)]
#[diesel(table_name = books)]
pub struct UpdateBookData {
  pub(crate) title: Option<String>,
  pub(crate) timestamp: Option<NaiveDateTime>,
  pub(crate) pubdate: Option<NaiveDateTime>,
  pub(crate) series_index: Option<f32>,
  pub(crate) isbn: Option<String>,
  pub(crate) lccn: Option<String>,
  pub(crate) flags: Option<i32>,
  pub(crate) has_cover: Option<bool>,
}