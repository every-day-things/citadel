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

    fn setup() -> BookRepository {
        let mut book_repo = BookRepository::new(":memory:".to_string());
        book_repo.run_migrations();
        book_repo
    }

    fn new_book_dto_factory(title: String) -> NewBookDto {
        NewBookDto {
            title: title,
            author_list: vec!["Logic".to_string()],
            timestamp: None,
            pubdate: None,
            series_index: 0.0,
            isbn: None,
            lccn: None,
            flags: 0,
            has_cover: Some(false),
        }
    }

    #[test]
    fn add_book() {
        let mut book_repo = setup();
        book_repo.run_migrations();
        let mut book_service = BookService::new(book_repo);

        let result = book_service.create(new_book_dto_factory("Test Book 1".to_string()));

        assert!(result.is_ok());
        assert_eq!(result.unwrap().title, "Test Book 1");
    }
}
