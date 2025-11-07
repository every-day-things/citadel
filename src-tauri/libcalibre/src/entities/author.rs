use diesel::prelude::*;
use diesel::query_builder::AsChangeset;
use serde::Deserialize;

use crate::schema::authors;
use crate::sorting;

#[derive(Clone, Debug, Queryable, Selectable, Identifiable, AsChangeset)]
#[diesel(table_name = authors)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Author {
    pub id: i32,
    pub name: String,
    pub sort: Option<String>,
    pub link: String,
}
impl Author {
    /// Generate a sortable name for this author.
    ///
    /// Based on APA style (see https://blog.apastyle.org/apastyle/2012/03/jr-sr-and-other-suffixes-in-apa-style.html,
    /// and https://blog.apastyle.org/apastyle/2017/05/whats-in-a-name-names-with-titles-in-them.html)
    ///
    /// ## Examples
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe".to_string(),
    ///    sort: None,
    ///    link: "".to_string(),
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// For Dr.'s and other titles, the title is removed.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///   id: 1,
    ///   name: "Dr. John Doe".to_string(),
    ///   sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// For Jr.'s and other generational titles, the title is moved to the end,
    /// with a comma before it.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe Jr.".to_string(),
    ///    sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John, Jr.");
    /// ```
    ///
    /// Academic degrees, licenses, and professional titles are omitted.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///    id: 1,
    ///    name: "John Doe BA Bsc M.S. PhD Esq".to_string(),
    ///    sort: None,
    ///    link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// Anything within brackets is removed.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///   id: 1,
    ///   name: "John Doe (Author) [Deceased] {Ed.: fictional character}".to_string(),
    ///   sort: None,
    ///   link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Doe, John");
    /// ```
    ///
    /// Organization names are not modified.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///   id: 1,
    ///  name: "Coca Cola Inc.".to_string(),
    ///  sort: None,
    /// link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "Coca Cola Inc.");
    /// ```
    ///
    /// Surnames with a prefix keep their prefix.
    /// ```
    /// use libcalibre::Author;
    /// let author = Author {
    ///   id: 1,
    ///  name: "Example von Cruz".to_string(),
    ///  sort: None,
    /// link: "".to_string()
    /// };
    /// let sortable_name = author.sortable_name();
    /// assert_eq!(sortable_name, "von Cruz, Example");
    /// ```
    pub fn sortable_name(&self) -> String {
        sorting::sort_author_name_apa(&self.name)
    }
}

#[derive(Insertable)]
#[diesel(table_name = authors)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct NewAuthor {
    pub name: String,
    pub sort: Option<String>,
    pub link: Option<String>,
}

#[derive(Deserialize, AsChangeset, Default, Debug)]
#[diesel(table_name = authors)]
pub struct UpdateAuthorData {
    pub(crate) name: Option<String>,
    pub(crate) sort: Option<String>,
    pub(crate) link: Option<String>,
}
