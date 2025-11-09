// Tests for file and folder name generation
// Validates sanitization and formatting of book file/folder names

use sanitise_file_name::sanitise;

#[test]
fn test_sanitise_removes_invalid_chars() {
    assert_eq!(sanitise("Book/Title"), "Book_Title");
    assert_eq!(sanitise("Book\\Title"), "Book_Title");
    assert_eq!(sanitise("Book:Title"), "Book_Title");
}

#[test]
fn test_sanitise_preserves_spaces() {
    assert_eq!(sanitise("The Great Gatsby"), "The Great Gatsby");
}

#[test]
fn test_sanitise_handles_special_chars() {
    assert_eq!(sanitise("Book? Title!"), "Book_ Title!");
}

#[test]
fn test_book_folder_name_format() {
    let title = "The Great Gatsby";
    let book_id = 42;
    let expected = format!("{} ({})", title, book_id);
    assert_eq!(expected, "The Great Gatsby (42)");
}

#[test]
fn test_book_folder_name_with_special_chars() {
    let title = "Book: A Story";
    let book_id = 1;
    let sanitized = sanitise(&format!("{} ({})", title, book_id));
    assert_eq!(sanitized, "Book_ A Story (1)");
}

#[test]
fn test_book_file_name_format() {
    let title = "The Great Gatsby";
    let author = "F. Scott Fitzgerald";
    let expected = format!("{} - {}", title, author);
    assert_eq!(expected, "The Great Gatsby - F. Scott Fitzgerald");
}

#[test]
fn test_book_file_name_with_special_chars() {
    let title = "Book/Title";
    let author = "Author\\Name";
    let unsanitized = format!("{} - {}", title, author);
    let sanitized = sanitise(&unsanitized);
    assert_eq!(sanitized, "Book_Title - Author_Name");
}

#[test]
fn test_book_file_name_preserves_dash() {
    let title = "Title";
    let author = "Author";
    let expected = format!("{} - {}", title, author);
    let sanitized = sanitise(&expected);
    assert_eq!(sanitized, "Title - Author");
}

#[test]
fn test_folder_name_with_very_long_title() {
    let title = "A".repeat(300);
    let book_id = 1;
    let folder = sanitise(&format!("{} ({})", title, book_id));
    // Should not panic - sanitise may truncate very long names
    // On some systems, file names are limited (e.g., 255 bytes)
    assert!(!folder.is_empty());
    // The sanitization might truncate, so we just ensure it doesn't panic
}
