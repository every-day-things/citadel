use diesel::prelude::*;

use crate::schema::series;

#[derive(Clone, Debug, Queryable, QueryableByName, Selectable, Identifiable)]
#[diesel(table_name = series)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Series {
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = series)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewSeries {
    pub name: String,
}
