#[cfg(test)]
mod book_service_tests {
    use libcalibre::{
        application::services::domain::book::{
            dto::{NewBookDto, UpdateBookDto},
            service::BookService,
        },
        infrastructure::domain::book::repository::BookRepository,
    };

    fn setup() -> BookRepository {
        let mut book_repo = BookRepository::new(":memory:");
        book_repo.run_migrations();
        book_repo
    }

    fn new_book_dto_factory(title: String) -> NewBookDto {
        NewBookDto {
            title,
            author_list: vec!["Logic".to_string()],
            timestamp: None,
            pubdate: None,
            series_index: 1.0,
            isbn: None,
            lccn: None,
            flags: 1,
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

    #[test]
    fn update_book() {
        let mut book_repo = setup();
        book_repo.run_migrations();
        let mut book_service = BookService::new(book_repo);

        let new_book = book_service.create(new_book_dto_factory("Test Book 1".to_string()));
        let updated = book_service.update(
            new_book.unwrap().id,
            UpdateBookDto {
                title: Some("Test Book 2".to_string()),
                author_list: Some(vec!["Logic".to_string()]),
                timestamp: None,
                pubdate: None,
                series_index: Some(2.0),
                isbn: None,
                lccn: None,
                flags: None,
                has_cover: Some(false),
            },
        );

        assert!(updated.is_ok());
        let updated = updated.unwrap();
        assert_eq!(&updated.title, "Test Book 2");
        // Was updated
        assert_eq!(updated.series_index, 2.0);
        // Not updated
        assert_eq!(updated.flags, 1);
    }

    #[test]
    fn get_book() {
        let mut book_repo = setup();
        book_repo.run_migrations();
        let mut book_service = BookService::new(book_repo);

        let new_book = book_service.create(new_book_dto_factory("Test Book 1".to_string()));
        let found = book_service.find_by_id(new_book.unwrap().id);

        assert!(found.is_ok());
        assert_eq!(found.unwrap().title, "Test Book 1");
    }

    #[test]
    fn list_all_books() {
        let mut book_repo = setup();
        book_repo.run_migrations();
        let mut book_service = BookService::new(book_repo);

        let book1 = book_service.create(new_book_dto_factory("Test Book 1".to_string()));
        let book2 = book_service.create(new_book_dto_factory("Test Book 2".to_string()));

        let book_list = book_service.all();

        assert!(book_list.is_ok());
        let unwrapped = book_list.unwrap();
        assert_eq!(unwrapped.len(), 2);
        assert_eq!(unwrapped.clone()[0].title, "Test Book 1");
        assert_eq!(unwrapped.clone()[0].id, book1.unwrap().id);
        assert_eq!(unwrapped.clone()[1].title, "Test Book 2");
        assert_eq!(unwrapped.clone()[1].id, book2.unwrap().id);
    }
}
