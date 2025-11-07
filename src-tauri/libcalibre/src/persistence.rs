use diesel::prelude::*;
use diesel::sql_query;
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

/// Converts author name from "First Last" to "Last, First" format for SQL.
///
/// This is a simplified version for SQL compatibility with Calibre.
/// For application-level sorting with more complex rules, see Author::sortable_name().
///
/// Based on Calibre's implementation:
/// https://github.com/kovidgoyal/calibre/blob/master/src/calibre/ebooks/metadata/__init__.py
///
/// ### Examples
/// ```
/// use libcalibre::persistence::sort_author_name;
/// let name = "John Smith";
/// let sorted = sort_author_name(name.to_string());
/// assert_eq!(sorted, "Smith, John");
/// ```
///
/// ```
/// use libcalibre::persistence::sort_author_name;
/// let name = "Smith, John";
/// let sorted = sort_author_name(name.to_string());
/// assert_eq!(sorted, "Smith, John"); // Already sorted
/// ```
///
/// ```
/// use libcalibre::persistence::sort_author_name;
/// let name = "Madonna";
/// let sorted = sort_author_name(name.to_string());
/// assert_eq!(sorted, "Madonna"); // Single name unchanged
/// ```
#[allow(unused)]
pub fn sort_author_name(name: String) -> String {
    let name = name.trim();

    // If empty, return empty
    if name.is_empty() {
        return String::new();
    }

    // If already in "Last, First" format (contains comma), return as-is
    if name.contains(',') {
        return name.to_string();
    }

    // Split by whitespace
    let parts: Vec<&str> = name.split_whitespace().collect();

    // Single name (e.g., "Madonna")
    if parts.len() == 1 {
        return name.to_string();
    }

    // Multiple names: move last word to front
    // "John Smith" → "Smith, John"
    // "John Paul Jones" → "Jones, John Paul"
    let last = parts[parts.len() - 1];
    let first = parts[0..parts.len() - 1].join(" ");

    format!("{}, {}", last, first)
}

/// Registers SQLite triggers for maintaining data integrity.
///
/// This function registers triggers that Calibre uses to:
/// - Auto-generate `sort` and `uuid` fields on book insert
/// - Update `sort` field when book title changes
/// - Cascade delete related records when a book is deleted
///
/// Triggers are registered using "DROP TRIGGER IF EXISTS" for idempotency,
/// so this function can be safely called multiple times.
pub fn register_triggers(conn: &mut SqliteConnection) -> Result<(), diesel::result::Error> {
    // Books insert trigger - auto-generate sort and uuid
    sql_query("DROP TRIGGER IF EXISTS books_insert_trg").execute(conn)?;
    sql_query(
        "CREATE TRIGGER books_insert_trg AFTER INSERT ON books
         BEGIN
             UPDATE books SET sort=title_sort(NEW.title), uuid=uuid4()
             WHERE id=NEW.id;
         END;",
    )
    .execute(conn)?;

    // Books update trigger - update sort when title changes
    sql_query("DROP TRIGGER IF EXISTS books_update_trg").execute(conn)?;
    sql_query(
        "CREATE TRIGGER books_update_trg AFTER UPDATE ON books
         BEGIN
             UPDATE books SET sort=title_sort(NEW.title)
             WHERE id=NEW.id AND OLD.title <> NEW.title;
         END;",
    )
    .execute(conn)?;

    // Books delete trigger - cascade delete related records
    sql_query("DROP TRIGGER IF EXISTS books_delete_trg").execute(conn)?;
    sql_query(
        "CREATE TRIGGER books_delete_trg AFTER DELETE ON books
         BEGIN
             DELETE FROM books_authors_link WHERE book=OLD.id;
             DELETE FROM books_publishers_link WHERE book=OLD.id;
             DELETE FROM books_ratings_link WHERE book=OLD.id;
             DELETE FROM books_series_link WHERE book=OLD.id;
             DELETE FROM books_tags_link WHERE book=OLD.id;
             DELETE FROM books_languages_link WHERE book=OLD.id;
             DELETE FROM data WHERE book=OLD.id;
             DELETE FROM comments WHERE book=OLD.id;
             DELETE FROM conversion_options WHERE book=OLD.id;
             DELETE FROM books_plugin_data WHERE book=OLD.id;
             DELETE FROM identifiers WHERE book=OLD.id;
         END;",
    )
    .execute(conn)?;

    Ok(())
}

pub fn establish_connection(db_path: &str) -> Result<diesel::SqliteConnection, ()> {
    // Setup custom SQL functions. Required because Calibre does this.
    // See: https://github.com/kovidgoyal/calibre/blob/7f3ccb333d906f5867636dd0dc4700b495e5ae6f/src/calibre/library/database.py#L55-L70
    define_sql_function!(fn title_sort(title: Text) -> Text);
    define_sql_function!(fn uuid4() -> Text);
    define_sql_function!(fn author_to_author_sort(name: Text) -> Text);

    let mut connection = diesel::SqliteConnection::establish(db_path).or(Err(()))?;

    // Register SQL function implementations. Ignore any errors.
    let _ = title_sort_utils::register_impl(&mut connection, sort_book_title);
    let _ = uuid4_utils::register_impl(&mut connection, || uuid::Uuid::new_v4().to_string());
    let _ = author_to_author_sort_utils::register_impl(&mut connection, sort_author_name);

    // Register triggers for data integrity and automatic field generation
    register_triggers(&mut connection)
        .map_err(|e| eprintln!("Failed to register triggers: {}", e))
        .ok();

    Ok(connection)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sort_author_name_simple() {
        assert_eq!(sort_author_name("John Smith".to_string()), "Smith, John");
    }

    #[test]
    fn test_sort_author_name_already_sorted() {
        assert_eq!(
            sort_author_name("Smith, John".to_string()),
            "Smith, John"
        );
    }

    #[test]
    fn test_sort_author_name_single_name() {
        assert_eq!(sort_author_name("Madonna".to_string()), "Madonna");
    }

    #[test]
    fn test_sort_author_name_multiple_names() {
        assert_eq!(
            sort_author_name("John Paul Jones".to_string()),
            "Jones, John Paul"
        );
    }

    #[test]
    fn test_sort_author_name_empty() {
        assert_eq!(sort_author_name("".to_string()), "");
    }

    #[test]
    fn test_sort_author_name_whitespace() {
        assert_eq!(sort_author_name("  ".to_string()), "");
    }
}
