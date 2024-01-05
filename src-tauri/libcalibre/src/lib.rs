mod persistence;
mod models;
mod operations;
mod schema;

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::{operations::book_ops::create_book, models::NewBook};

    use super::*;

    #[test]
    fn add_book() {
        let library_path = Path::new("/Users/phil/dev/macos-book-app/sample-library");
        let result = create_book(library_path, NewBook {
            title: "Test Book".to_string(),
            timestamp: None,
            pubdate: None,
            series_index: 0.0,
            author_sort: None,
            isbn: None,
            lccn: None,
            flags: 0,
            has_cover: Some(false)
        });

        println!("Result: {:?}", result.unwrap());
    }

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
