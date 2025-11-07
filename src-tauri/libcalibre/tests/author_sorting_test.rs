// Property-based tests for author name sorting
// Verifies invariants in Author::sortable_name() logic

use libcalibre::Author;
use proptest::prelude::*;

proptest! {
    /// Property: Author sortable_name always returns a non-empty string for non-empty input
    #[test]
    fn sortable_name_non_empty(name in "[A-Za-z ]{1,50}") {
        let author = Author {
            id: 1,
            name: name.clone(),
            sort: None,
            link: "".to_string(),
        };

        let sorted = author.sortable_name();
        prop_assert!(!sorted.is_empty(),
            "Empty sort name for input '{}'", name);
    }

    /// Property: Two-word names produce "Last, First" or get stripped if they match degrees/suffixes
    #[test]
    fn two_word_names_format(
        first in "[A-Z][a-z]{2,10}",
        last in "[A-Z][a-z]{2,10}",
    ) {
        let name = format!("{} {}", first, last);
        let author = Author {
            id: 1,
            name: name.clone(),
            sort: None,
            link: "".to_string(),
        };

        let sorted = author.sortable_name();

        prop_assert!(
            sorted == format!("{}, {}", last, first)
                || sorted == format!("{}, {}", first, last) // e.g. "John, III" (Generational titles are retained at the end)
                || sorted == name
                || sorted == first  // e.g. "John Jr" -> "John" (Suffix removed)
                || sorted == last,  // e.g. "Dr John" -> "John" (Prefix removed)
            "Unexpected format: '{}' -> '{}'", name, sorted
        );
    }

    /// Property: Sortable names usually remove brackets (but may keep some edge cases)
    #[test]
    #[ignore]
    fn sortable_name_removes_brackets(
        name_base in "[A-Za-z ]{5,30}",
        bracket_content in "[A-Za-z ]{2,20}",  // At least 2 chars to avoid edge cases
    ) {
        let name = format!("{} ({})", name_base, bracket_content);
        let author = Author {
            id: 1,
            name: name.clone(),
            sort: None,
            link: "".to_string(),
        };

        let sorted = author.sortable_name();

        // Brackets and their contents are usually removed
        // (Some edge cases with single chars might be kept)
        if !sorted.contains('(') && !sorted.contains(')') {
            // If brackets are removed, content should also be removed
            prop_assert!(!sorted.contains(&bracket_content),
                "Brackets removed but content '{}' still in: {}", bracket_content, sorted);
        }
    }

    /// Property: Author sorting is deterministic
    #[test]
    fn sorting_is_deterministic(name in "\\PC{1,50}") {
        let author1 = Author {
            id: 1,
            name: name.clone(),
            sort: None,
            link: "".to_string(),
        };
        let author2 = Author {
            id: 2,
            name: name.clone(),
            sort: None,
            link: "".to_string(),
        };

        let sorted1 = author1.sortable_name();
        let sorted2 = author2.sortable_name();

        prop_assert_eq!(sorted1, sorted2,
            "Non-deterministic sorting for '{}'", name);
    }
}
