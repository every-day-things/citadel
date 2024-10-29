use diesel::prelude::*;
use diesel::sql_types::Text;
use regex::Regex;

/// Creates a sortable book title by moving the preposition to the end of the title.
///
/// "Unused" is allowed because this function is called from SQL, and registered
/// with the database connection.
///
/// ### Examples
/// ```
/// use libcalibre::persistence::sort_book_title;
/// let title = "A War of the Worlds";
/// let new_title = sort_book_title(title.to_string());
/// assert_eq!(new_title, "War of the Worlds, A");
/// ````
///
/// ```
/// use libcalibre::persistence::sort_book_title;
/// let title = "The War of the Worlds";
/// let new_title = sort_book_title(title.to_string());
/// assert_eq!(new_title, "War of the Worlds, The");
/// ```
#[allow(unused)]
pub fn sort_book_title(title: String) -> String {
    let title_pattern: &str = r"(A|The|An)\s+";
    let title_pattern_regex: Regex = Regex::new(title_pattern).unwrap();
    // Based on Calibre's implementation
    // https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L61C1-L69C54

    if let Some(matched) = title_pattern_regex.find(&title) {
        let preposition = matched.as_str();
        let new_title = format!("{}, {}", title.replacen(preposition, "", 1), preposition);
        return new_title.trim().to_string();
    }

    title.clone()
}

pub fn establish_connection(db_path: &str) -> Result<diesel::SqliteConnection, ()> {
    // Setup custom SQL functions. Required because Calibre does this.
    // See: https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L55-L70
    define_sql_function!(fn title_sort(title: Text) -> Text);
    define_sql_function!(fn uuid4() -> Text);

    let mut connection = diesel::SqliteConnection::establish(db_path).or(Err(()))?;

    // Register SQL function implementations. Ignore any errors.
    let _ = title_sort_utils::register_impl(&mut connection, sort_book_title);
    let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());

    Ok(connection)
}
