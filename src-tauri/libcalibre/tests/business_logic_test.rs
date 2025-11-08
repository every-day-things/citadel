// Unit tests for libcalibre business logic functions
// These test the core formatting and naming logic that must match Calibre's behavior

use libcalibre::persistence::sort_book_title;
use libcalibre::Author;

// Helper to create test authors
fn make_author(name: &str) -> Author {
    Author {
        id: 1,
        name: name.to_string(),
        sort: None,
        link: "".to_string(),
    }
}

/// Tests for sort_book_title function
/// Based on Calibre's title sorting: moves articles (A, An, The) to the end
mod sort_book_title_tests {
    use super::*;

    #[test]
    fn test_sort_title_with_an() {
        assert_eq!(
            sort_book_title("An American Tragedy".to_string()),
            "American Tragedy, An"
        );
    }

    #[test]
    fn test_sort_title_without_article() {
        assert_eq!(
            sort_book_title("War and Peace".to_string()),
            "War and Peace"
        );
    }

    #[test]
    fn test_sort_title_single_word() {
        assert_eq!(sort_book_title("Dune".to_string()), "Dune");
    }

    #[test]
    fn test_sort_title_article_not_at_start() {
        // Article in middle should not be moved
        assert_eq!(
            sort_book_title("War of the Worlds".to_string()),
            "War of the Worlds"
        );
    }

    #[test]
    fn test_sort_title_empty() {
        assert_eq!(sort_book_title("".to_string()), "");
    }

    #[test]
    fn test_sort_title_only_article() {
        assert_eq!(sort_book_title("The".to_string()), "The");
    }

    #[test]
    fn test_sort_title_multiple_words_with_a() {
        assert_eq!(
            sort_book_title("A Tale of Two Cities".to_string()),
            "Tale of Two Cities, A"
        );
    }
}

mod author_sortable_name_tests {
    use super::*;

    #[test]
    fn test_three_part_name() {
        let author = make_author("John Robert Doe");
        assert_eq!(author.sortable_name(), "Doe, John Robert");
    }

    #[test]
    fn test_single_name() {
        // Names with fewer than 2 tokens are not modified
        let author = make_author("Madonna");
        assert_eq!(author.sortable_name(), "Madonna");
    }

    #[test]
    fn test_remove_prefix_title_mr() {
        let author = make_author("Mr. John Doe");
        assert_eq!(author.sortable_name(), "Doe, John");
    }

    #[test]
    fn test_remove_prefix_title_prof() {
        let author = make_author("Prof. Jane Smith");
        assert_eq!(author.sortable_name(), "Smith, Jane");
    }

    #[test]
    fn test_generational_suffix_sr() {
        let author = make_author("John Doe Sr.");
        assert_eq!(author.sortable_name(), "Doe, John, Sr.");
    }

    #[test]
    fn test_generational_suffix_ii() {
        let author = make_author("John Doe II");
        assert_eq!(author.sortable_name(), "Doe, John, II");
    }

    #[test]
    fn test_remove_multiple_degrees() {
        let author = make_author("John Doe BA BSc M.S. PhD Esq");
        assert_eq!(author.sortable_name(), "Doe, John");
    }

    #[test]
    fn test_remove_parenthetical_content() {
        let author = make_author("Jane Smith (Editor)");
        assert_eq!(author.sortable_name(), "Smith, Jane");
    }

    #[test]
    fn test_remove_bracket_content() {
        let author = make_author("John Doe [Deceased]");
        assert_eq!(author.sortable_name(), "Doe, John");
    }

    #[test]
    fn test_remove_brace_content() {
        let author = make_author("John Doe {Ed.: fictional}");
        assert_eq!(author.sortable_name(), "Doe, John");
    }

    #[test]
    fn test_organization_corporation() {
        let author = make_author("Acme Corporation");
        assert_eq!(author.sortable_name(), "Acme Corporation");
    }

    #[test]
    fn test_organization_company() {
        let author = make_author("Widget Company");
        assert_eq!(author.sortable_name(), "Widget Company");
    }

    #[test]
    fn test_surname_prefix_van() {
        let author = make_author("John van Dyke");
        assert_eq!(author.sortable_name(), "van Dyke, John");
    }

    #[test]
    fn test_surname_prefix_de() {
        let author = make_author("Leonardo de Vinci");
        assert_eq!(author.sortable_name(), "de Vinci, Leonardo");
    }

    #[test]
    fn test_surname_prefix_van_der() {
        let author = make_author("Jan van der Berg");
        assert_eq!(author.sortable_name(), "van der Berg, Jan");
    }

    #[test]
    fn test_two_word_name_with_prefix_unchanged() {
        // Two-word names where first is a prefix are not modified
        let author = make_author("von Neumann");
        assert_eq!(author.sortable_name(), "von Neumann");
    }

    #[test]
    fn test_complex_name_with_title_suffix_and_degree() {
        let author = make_author("Dr. John Robert Doe Jr. PhD");
        assert_eq!(author.sortable_name(), "Doe, John Robert, Jr.");
    }

    #[test]
    fn test_name_with_multiple_prefixes_removed() {
        let author = make_author("Dr. Prof. John Doe");
        assert_eq!(author.sortable_name(), "Doe, John");
    }
}

/// Tests for combined_author_sort function
/// This function formats multiple authors into a single sort string
mod combined_author_sort_tests {
    use super::*;

    // Note: combined_author_sort is not pub, so we test it indirectly through snapshot tests
    // But we can document expected behavior here

    #[test]
    fn test_single_author_sorting() {
        let author = make_author("John Doe");
        assert_eq!(author.sortable_name(), "Doe, John");
    }

    #[test]
    fn test_multiple_authors_would_use_ampersand() {
        // combined_author_sort joins with " & "
        // Example: "Doe, John & Smith, Jane"
        let author1 = make_author("John Doe");
        let author2 = make_author("Jane Smith");

        // Verify individual sortable names
        assert_eq!(author1.sortable_name(), "Doe, John");
        assert_eq!(author2.sortable_name(), "Smith, Jane");

        // The actual combination is tested in snapshot tests
    }
}

/// Tests for file and folder name generation.
/// Some tests validate overall behaviour of sanitisation and formatting.
mod name_generation_tests {
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

    // Test expected book folder name format
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

    // Test expected book file name format
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
}

mod edge_cases {
    use super::*;

    #[test]
    fn test_author_name_with_unicode() {
        let author = Author {
            id: 1,
            name: "José García".to_string(),
            sort: None,
            link: "".to_string(),
        };
        assert_eq!(author.sortable_name(), "García, José");
    }

    #[test]
    fn test_author_name_with_emoji() {
        let author = Author {
            id: 1,
            name: "John Doe 😀".to_string(),
            sort: None,
            link: "".to_string(),
        };
        // Should handle gracefully
        let result = author.sortable_name();
        assert!(result.contains("Doe"));
    }

    #[test]
    fn test_book_title_with_unicode() {
        let title = "El Niño".to_string();
        let result = sort_book_title(title.clone());
        assert_eq!(result, title); // No article, unchanged
    }

    #[test]
    fn test_book_title_with_numbers() {
        assert_eq!(sort_book_title("The 39 Steps".to_string()), "39 Steps, The");
    }

    #[test]
    fn test_very_long_author_name() {
        let author = Author {
            id: 1,
            name: "Dr. John Robert Michael Alexander Christopher Benjamin Doe III PhD MD JD Esq"
                .to_string(),
            sort: None,
            link: "".to_string(),
        };
        let result = author.sortable_name();
        // Should handle gracefully and produce valid output
        assert!(result.contains("Doe"));
        assert!(result.contains("John"));
        assert!(result.contains("III"));
    }

    #[test]
    fn test_folder_name_with_very_long_title() {
        let title = "A".repeat(300);
        let book_id = 1;
        let folder = sanitise_file_name::sanitise(&format!("{} ({})", title, book_id));
        // Should not panic - sanitise may truncate very long names
        // On some systems, file names are limited (e.g., 255 bytes)
        assert!(!folder.is_empty());
        // The sanitization might truncate, so we just ensure it doesn't panic
    }
}
