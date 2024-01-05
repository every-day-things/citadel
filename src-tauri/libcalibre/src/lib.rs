mod application;
mod domain;
mod infrastructure;
mod models;
mod operations;
mod persistence;
mod schema;

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

#[cfg(test)]
mod tests {
    use crate::{
        application::services::domain::book::{dto::NewBookDto, service::BookService},
        infrastructure::domain::book::repository::BookRepository,
    };

    use super::*;

    #[test]
    fn add_book() {
        let book_repo = BookRepository::new(
            "/Users/phil/dev/macos-book-app/sample-library/metadata.db".to_string(),
        );
        let mut book_service = BookService::new(book_repo);

        let result = book_service.create(NewBookDto {
            title: "Test Book".to_string(),
            author_list: vec!["Phil".to_string()],
            timestamp: None,
            pubdate: None,
            series_index: 0.0,
            isbn: None,
            lccn: None,
            flags: 0,
            has_cover: Some(false),
        });

        println!("Result: {:?}", result.unwrap());
    }

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
