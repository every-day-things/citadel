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

    let mut connection = diesel::SqliteConnection::establish(db_path).or(Err(()))?;

    // Register SQL function implementations. Ignore any errors.
    let _ = title_sort_utils::register_impl(&mut connection, sort_book_title);
    let _ = uuid4_utils::register_impl(&connection, || uuid::Uuid::new_v4().to_string());

    // Register triggers for data integrity and automatic field generation
    register_triggers(&mut connection)
        .map_err(|e| eprintln!("Failed to register triggers: {}", e))
        .ok();

    Ok(connection)
}
