use diesel::prelude::*;

use crate::schema::languages;

#[derive(Clone, Debug, Queryable, QueryableByName, Selectable, Identifiable)]
#[diesel(table_name = languages)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Language {
    pub id: i32,
    pub lang_code: String,
}

#[derive(Insertable)]
#[diesel(table_name = languages)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewLanguage {
    pub lang_code: String,
}
