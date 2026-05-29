use diesel::prelude::*;

use crate::schema::tags;

#[derive(Clone, Debug, Queryable, QueryableByName, Selectable, Identifiable)]
#[diesel(table_name = tags)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Tag {
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = tags)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewTag {
    pub name: String,
}
