//! Type-safe ID wrappers for Calibre entities.
//!
//! These newtypes prevent mixing up different entity IDs and provide
//! convenient parsing and display implementations.

use std::fmt;
use std::num::ParseIntError;
use std::str::FromStr;

/// Type-safe wrapper for book IDs.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub struct BookId(pub i32);

/// Type-safe wrapper for author IDs.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub struct AuthorId(pub i32);

/// Type-safe wrapper for book file IDs.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub struct BookFileId(pub i32);

/// Type-safe wrapper for identifier IDs.
#[derive(Debug, Copy, Clone, PartialEq, Eq, Hash)]
pub struct IdentifierId(pub i32);

// === Macro to reduce boilerplate ===

macro_rules! impl_id_type {
    ($type_name:ident, $prefix:expr) => {
        impl $type_name {
            /// Create a new ID from a raw i32.
            pub fn new(id: i32) -> Self {
                Self(id)
            }

            /// Get the raw i32 value.
            pub fn as_i32(&self) -> i32 {
                self.0
            }
        }

        impl From<i32> for $type_name {
            fn from(id: i32) -> Self {
                Self(id)
            }
        }

        impl From<$type_name> for i32 {
            fn from(id: $type_name) -> i32 {
                id.0
            }
        }

        impl fmt::Display for $type_name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{}_{}", $prefix, self.0)
            }
        }

        impl FromStr for $type_name {
            type Err = ParseIntError;

            fn from_str(s: &str) -> Result<Self, Self::Err> {
                let id_str = s.strip_prefix(&format!("{}_", $prefix)).unwrap_or(s);
                id_str.parse::<i32>().map(Self)
            }
        }
    };
}

impl_id_type!(BookId, "book");
impl_id_type!(AuthorId, "author");
impl_id_type!(BookFileId, "file");
impl_id_type!(IdentifierId, "identifier");

#[cfg(test)]
mod tests {
    use super::*;

    // === BookId Tests ===

    #[test]
    fn book_id_display() {
        assert_eq!(BookId(123).to_string(), "book_123");
        assert_eq!(BookId(0).to_string(), "book_0");
        assert_eq!(BookId(-1).to_string(), "book_-1");
    }

    #[test]
    fn book_id_parse_with_prefix() {
        assert_eq!("book_123".parse::<BookId>().unwrap(), BookId(123));
        assert_eq!("book_0".parse::<BookId>().unwrap(), BookId(0));
        assert_eq!("book_999".parse::<BookId>().unwrap(), BookId(999));
    }

    #[test]
    fn book_id_parse_without_prefix() {
        assert_eq!("123".parse::<BookId>().unwrap(), BookId(123));
        assert_eq!("0".parse::<BookId>().unwrap(), BookId(0));
        assert_eq!("999".parse::<BookId>().unwrap(), BookId(999));
    }

    #[test]
    fn book_id_parse_invalid() {
        assert!("book_abc".parse::<BookId>().is_err());
        assert!("abc".parse::<BookId>().is_err());
        assert!("book_".parse::<BookId>().is_err());
        assert!("".parse::<BookId>().is_err());
    }

    #[test]
    fn book_id_roundtrip() {
        let id = BookId(42);
        let parsed: BookId = id.to_string().parse().unwrap();
        assert_eq!(id, parsed);
    }

    #[test]
    fn book_id_from_i32() {
        assert_eq!(BookId::from(123), BookId(123));
        assert_eq!(BookId::new(456), BookId(456));
    }

    #[test]
    fn book_id_to_i32() {
        assert_eq!(i32::from(BookId(123)), 123);
        assert_eq!(BookId(456).as_i32(), 456);
    }

    #[test]
    fn book_id_equality() {
        assert_eq!(BookId(1), BookId(1));
        assert_ne!(BookId(1), BookId(2));
    }

    #[test]
    fn book_id_hash() {
        use std::collections::HashSet;
        let mut set = HashSet::new();
        set.insert(BookId(1));
        set.insert(BookId(1)); // Duplicate
        set.insert(BookId(2));
        assert_eq!(set.len(), 2);
    }

    // === AuthorId Tests ===

    #[test]
    fn author_id_display() {
        assert_eq!(AuthorId(123).to_string(), "author_123");
        assert_eq!(AuthorId(0).to_string(), "author_0");
    }

    #[test]
    fn author_id_parse_with_prefix() {
        assert_eq!("author_123".parse::<AuthorId>().unwrap(), AuthorId(123));
        assert_eq!("author_0".parse::<AuthorId>().unwrap(), AuthorId(0));
    }

    #[test]
    fn author_id_parse_without_prefix() {
        assert_eq!("123".parse::<AuthorId>().unwrap(), AuthorId(123));
        assert_eq!("0".parse::<AuthorId>().unwrap(), AuthorId(0));
    }

    #[test]
    fn author_id_parse_invalid() {
        assert!("author_abc".parse::<AuthorId>().is_err());
        assert!("xyz".parse::<AuthorId>().is_err());
    }

    #[test]
    fn author_id_roundtrip() {
        let id = AuthorId(99);
        let parsed: AuthorId = id.to_string().parse().unwrap();
        assert_eq!(id, parsed);
    }

    #[test]
    fn author_id_from_i32() {
        assert_eq!(AuthorId::from(123), AuthorId(123));
    }

    #[test]
    fn author_id_to_i32() {
        assert_eq!(i32::from(AuthorId(123)), 123);
    }

    // === BookFileId Tests ===

    #[test]
    fn file_id_display() {
        assert_eq!(BookFileId(456).to_string(), "file_456");
    }

    #[test]
    fn file_id_parse() {
        assert_eq!("file_456".parse::<BookFileId>().unwrap(), BookFileId(456));
        assert_eq!("456".parse::<BookFileId>().unwrap(), BookFileId(456));
    }

    #[test]
    fn file_id_roundtrip() {
        let id = BookFileId(789);
        let parsed: BookFileId = id.to_string().parse().unwrap();
        assert_eq!(id, parsed);
    }

    // === IdentifierId Tests ===

    #[test]
    fn identifier_id_display() {
        assert_eq!(IdentifierId(111).to_string(), "identifier_111");
    }

    #[test]
    fn identifier_id_parse() {
        assert_eq!(
            "identifier_111".parse::<IdentifierId>().unwrap(),
            IdentifierId(111)
        );
        assert_eq!("111".parse::<IdentifierId>().unwrap(), IdentifierId(111));
    }

    #[test]
    fn identifier_id_roundtrip() {
        let id = IdentifierId(222);
        let parsed: IdentifierId = id.to_string().parse().unwrap();
        assert_eq!(id, parsed);
    }

    // === Type Safety Tests ===

    #[test]
    fn ids_are_not_interchangeable() {
        let book = BookId(1);
        let author = AuthorId(1);

        // This should not compile (uncomment to verify):
        // assert_eq!(book, author);

        // But we can compare their raw values explicitly if needed:
        assert_eq!(book.as_i32(), author.as_i32());
    }
}
