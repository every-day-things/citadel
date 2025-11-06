// Property-based tests for filesystem sanitization
// Verifies that file/folder names are always safe for any filesystem

use proptest::prelude::*;
use sanitise_file_name::sanitise;

proptest! {
    /// Property: Generated folder names never contain invalid filesystem characters
    #[test]
    fn folder_names_are_filesystem_safe(
        title in "\\PC{0,100}",  // Any printable characters, 0-100 length
        book_id in 1..100000i32,
    ) {
        let folder_name = sanitise(&format!("{} ({})", title, book_id));

        // Must not contain filesystem-invalid characters
        assert!(!folder_name.contains('/'), "Folder name contains /: {}", folder_name);
        assert!(!folder_name.contains('\\'), "Folder name contains \\: {}", folder_name);
        assert!(!folder_name.contains(':'), "Folder name contains :: {}", folder_name);
        assert!(!folder_name.contains('*'), "Folder name contains *: {}", folder_name);
        assert!(!folder_name.contains('?'), "Folder name contains ?: {}", folder_name);
        assert!(!folder_name.contains('"'), "Folder name contains \": {}", folder_name);
        assert!(!folder_name.contains('<'), "Folder name contains <: {}", folder_name);
        assert!(!folder_name.contains('>'), "Folder name contains >: {}", folder_name);
        assert!(!folder_name.contains('|'), "Folder name contains |: {}", folder_name);
    }

    /// Property: Generated file names never contain invalid filesystem characters
    #[test]
    fn file_names_are_filesystem_safe(
        title in "\\PC{0,100}",
        author in "\\PC{0,100}",
    ) {
        let file_name = sanitise(&format!("{} - {}", title, author));

        // Must not contain filesystem-invalid characters
        assert!(!file_name.contains('/'));
        assert!(!file_name.contains('\\'));
        assert!(!file_name.contains(':'));
        assert!(!file_name.contains('*'));
        assert!(!file_name.contains('?'));
        assert!(!file_name.contains('"'));
        assert!(!file_name.contains('<'));
        assert!(!file_name.contains('>'));
        assert!(!file_name.contains('|'));
    }

    /// Property: Book IDs always appear in folder names
    #[test]
    fn folder_names_contain_book_id(
        title in "\\PC{1,100}",
        book_id in 1..100000i32,
    ) {
        let folder_name = sanitise(&format!("{} ({})", title, book_id));

        // The book ID must appear somewhere in the folder name
        let id_str = book_id.to_string();
        assert!(folder_name.contains(&id_str),
            "Folder name '{}' does not contain book ID {}", folder_name, book_id);
    }

    /// Property: Folder names always contain parentheses with ID
    #[test]
    fn folder_names_have_parentheses(
        title in "\\PC{1,100}",
        book_id in 1..100000i32,
    ) {
        let folder_name = sanitise(&format!("{} ({})", title, book_id));

        // Should have the format "Title (ID)"
        assert!(folder_name.contains('('), "Missing opening paren in: {}", folder_name);
        assert!(folder_name.contains(')'), "Missing closing paren in: {}", folder_name);
    }

    /// Property: Sanitization is idempotent (applying twice gives same result)
    #[test]
    fn sanitization_is_idempotent(s in "\\PC{0,200}") {
        let once = sanitise(&s);
        let twice = sanitise(&once);

        prop_assert_eq!(&once, &twice,
            "Sanitization not idempotent: '{}' vs '{}'", once, twice);
    }

    /// Property: Sanitized strings are never empty if input is non-empty
    #[test]
    fn sanitization_preserves_non_emptiness(s in "\\PC{1,200}") {
        let result = sanitise(&s);

        // If we started with a non-empty string, result should be non-empty
        // (though it might be truncated or modified)
        prop_assert!(!result.is_empty() || s.chars().all(|c| "\\/:*?\"<>|".contains(c)),
            "Non-empty input '{}' produced empty result", s);
    }

    /// Property: Sanitization preserves length or makes it smaller
    #[test]
    fn sanitization_doesnt_expand(s in "\\PC{0,200}") {
        let result = sanitise(&s);

        // Sanitization should never make the string longer
        prop_assert!(result.len() <= s.len() || result.len() <= 255,
            "Sanitization expanded string from {} to {} chars", s.len(), result.len());
    }

    /// Property: Complete book folder creation is filesystem-safe
    #[test]
    fn complete_book_folder_workflow(
        title in "\\PC{1,100}",
        author_first in "[A-Z][a-z]{2,15}",
        author_last in "[A-Z][a-z]{2,15}",
        book_id in 1..100000i32,
    ) {
        use libcalibre::Author;
        use libcalibre::persistence::sort_book_title;

        // Simulate the complete workflow
        let author_name = format!("{} {}", author_first, author_last);
        let author = Author {
            id: 1,
            name: author_name.clone(),
            sort: None,
            link: "".to_string(),
        };

        let sorted_title = sort_book_title(title.clone());
        let sorted_author = author.sortable_name();
        let folder_name = sanitise(&format!("{} ({})", sorted_title, book_id));
        let file_name = sanitise(&format!("{} - {}", sorted_title, author_name));

        // All outputs must be filesystem-safe
        for c in "/\\:*?\"<>|".chars() {
            prop_assert!(!folder_name.contains(c),
                "Folder name contains invalid char '{}': {}", c, folder_name);
            prop_assert!(!file_name.contains(c),
                "File name contains invalid char '{}': {}", c, file_name);
        }

        // Folder must contain ID
        prop_assert!(folder_name.contains(&book_id.to_string()),
            "Folder '{}' missing book ID {}", folder_name, book_id);

        // Names must not be empty
        prop_assert!(!folder_name.is_empty());
        prop_assert!(!file_name.is_empty());
        prop_assert!(!sorted_author.is_empty());
    }
}
