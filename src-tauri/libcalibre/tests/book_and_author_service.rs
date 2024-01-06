#[cfg(test)]
mod book_and_author_service_tests {
    use libcalibre::{
        application::services::domain::{
            author::dto::NewAuthorDto, book::dto::NewBookDto,
            book_and_author::service::BookAndAuthorService,
        },
        infrastructure::domain::{
            author::repository::AuthorRepository, book::repository::BookRepository,
        },
    };

    fn setup() -> (BookRepository, AuthorRepository) {
        let connection_url = "file::memory:?cache=shared";
        let mut book_repo = BookRepository::new(connection_url);
        let mut author_repo = AuthorRepository::new(connection_url);
        book_repo.run_migrations();
        author_repo.run_migrations();

        (book_repo, author_repo)
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

    fn new_author_dto_factory(name: String) -> NewAuthorDto {
        NewAuthorDto {
            full_name: name.clone(),
            sortable_name: name,
            external_url: None,
        }
    }

    #[test]
    fn add_book_with_authors() {
        let (book_repo, author_repo) = setup();
        let mut book_and_author_service = BookAndAuthorService::new(book_repo, author_repo);

        let ex_book = new_book_dto_factory("Test Book 1".to_string());
        let ex_author = new_author_dto_factory("Porter Robinson".to_string());

        let created = book_and_author_service
            .create(ex_book, vec![ex_author])
            .unwrap();

        // Verify that returned object has right data
        assert_eq!(created.book.title, "Test Book 1");
        assert_eq!(created.authors.len(), 1);
        assert_eq!(created.authors[0].name, "Porter Robinson");

        // Verify we can get that book & author from the database by book ID
        let result_from_db = book_and_author_service
            .find_book_with_authors(created.book.id)
            .unwrap();

        assert_eq!(result_from_db.book.title, "Test Book 1");
        assert_eq!(result_from_db.authors.len(), 1);
        assert_eq!(result_from_db.authors[0].name, "Porter Robinson");
    }
}
