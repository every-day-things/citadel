#[cfg(test)]
mod file_service_tests {
    use std::sync::{Arc, Mutex};

    use libcalibre::{
        application::services::domain::{
            book::{dto::NewBookDto, service::BookService},
            file::{
                dto::{NewFileDto, UpdateFileDto},
                service::BookFileService,
            },
        },
        infrastructure::domain::{
            book::repository::BookRepository, book_file::repository::BookFileRepository,
        },
    };

    fn setup() -> (Arc<Mutex<BookFileRepository>>, BookRepository) {
        let connection_url = "file::memory:?cache=shared";
        let mut book_repo = BookRepository::new(connection_url);
        let file_repo = Arc::new(Mutex::new(BookFileRepository::new(connection_url)));

        // Run migrations for the schema: affects all Repos
        book_repo.run_migrations();

        (file_repo, book_repo)
    }

    fn new_file_dto_factory(filename: String, book_id: i32, format: String) -> NewFileDto {
        NewFileDto {
            book_id,
            file_format: format,
            file_size_bytes: 250374,
            name_without_extension: filename,
        }
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
    fn add_file() {
        let (file_repo, book_repo) = setup();

        let mut book_service = BookService::new(book_repo);
        let file_service = BookFileService::new(file_repo);

        let book = book_service
            .create(new_book_dto_factory("Book for File Test".to_string()))
            .unwrap();
        let result = file_service
            .create(new_file_dto_factory(
                "Filename1".to_string(),
                book.id,
                "EPUB".to_string(),
            ))
            .unwrap();

        // Verify file we got back
        assert_eq!(result.name, "Filename1");

        // Check DB for created file
        let book_in_db = file_service.find_by_id(result.id).unwrap();
        assert_eq!(book_in_db.name, "Filename1");
    }

    #[test]
    fn update_file() {
        let (file_repo, book_repo) = setup();
        let mut book_service = BookService::new(book_repo);
        let mut file_service = BookFileService::new(file_repo);

        let book = book_service
            .create(new_book_dto_factory("Book for File Test".to_string()))
            .unwrap();
        let original_file = file_service
            .create(new_file_dto_factory(
                "Filename1".to_string(),
                book.id,
                "EPUB".to_string(),
            ))
            .unwrap();

        let updated = file_service.update(
            original_file.id,
            UpdateFileDto {
                book_id: None,
                file_format: Some("MOBI".to_string()),
                file_size_bytes: None,
                name_without_extension: Some("Filename2".to_string()),
            },
        );

        assert!(updated.is_ok());
        let updated = updated.unwrap();
        // Not updated
        // Magic number from factory
        assert_eq!(updated.uncompressed_size, 250374);
        // Was updated
        assert_eq!(updated.name, "Filename2");
        assert_eq!(updated.format, "MOBI");
    }

    #[test]
    fn find_all_for_book_id() {
        let (file_repo, book_repo) = setup();
        let mut book_service = BookService::new(book_repo);
        let mut file_service = BookFileService::new(file_repo);

        let book = book_service
            .create(new_book_dto_factory("Book for File Test".to_string()))
            .unwrap();
        let _ = file_service
            .create(new_file_dto_factory(
                "Filename1".to_string(),
                book.id,
                "EPUB".to_string(),
            ))
            .unwrap();
        let _ = file_service
            .create(new_file_dto_factory(
                "Filename2".to_string(),
                book.id,
                "MOBI".to_string(),
            ))
            .unwrap();

        let book_in_db = file_service.find_all_for_book_id(book.id).unwrap();
        assert_eq!(book_in_db.len(), 2);
        if let [item1, item2] = &book_in_db[..] {
            assert_eq!(item1.name, "Filename1");
            assert_eq!(item2.name, "Filename2");
        } else {
            panic!("Expected two items");
        }
    }
}
