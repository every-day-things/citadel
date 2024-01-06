#[cfg(test)]
mod author_service_tests {
    use libcalibre::{
        application::services::domain::author::{
            dto::{NewAuthorDto, UpdateAuthorDto},
            service::AuthorService,
        },
        infrastructure::domain::author::repository::AuthorRepository,
    };

    fn setup() -> AuthorRepository {
        let mut author_repo = AuthorRepository::new(":memory:");
        author_repo.run_migrations();
        author_repo
    }

    fn new_author_dto_factory(title: String) -> NewAuthorDto {
        NewAuthorDto {
            full_name: title,
            sortable_name: "Last Name, First Name".to_string(),
            external_url: None,
        }
    }

    #[test]
    fn add_author() {
        let mut author_repo = setup();
        author_repo.run_migrations();
        let mut author_service = AuthorService::new(author_repo);

        let result = author_service.create(new_author_dto_factory("Test Author 1".to_string()));

        assert!(result.is_ok());
        assert_eq!(result.unwrap().name, "Test Author 1");
    }

    #[test]
    fn update_author() {
        let mut author_repo = setup();
        author_repo.run_migrations();
        let mut author_service = AuthorService::new(author_repo);

        let new_author = author_service.create(new_author_dto_factory("Test Author 1".to_string()));
        let updated = author_service.update(
            new_author.unwrap().id,
            UpdateAuthorDto {
                full_name: None,
                sortable_name: Some("Last Name, First Name Middle".to_string()),
                external_url: Some("https://github.com/every-day-things/citadel".to_string()),
            },
        );

        assert!(updated.is_ok());
        let updated = updated.unwrap();
        // Not updated
        assert_eq!(&updated.name, "Test Author 1");
        // Was updated
        assert_eq!(
            updated.sort,
            Some("Last Name, First Name Middle".to_string())
        );
        assert_eq!(
            updated.link,
            "https://github.com/every-day-things/citadel".to_string()
        );
    }

    #[test]
    fn get_author() {
        let mut author_repo = setup();
        author_repo.run_migrations();
        let mut author_service = AuthorService::new(author_repo);

        let new_author = author_service.create(new_author_dto_factory("Test Author 1".to_string()));
        let found = author_service.find_by_id(new_author.unwrap().id);

        assert!(found.is_ok());
        assert_eq!(found.unwrap().name, "Test Author 1");
    }

    #[test]
    fn list_all_authors() {
        let mut author_repo = setup();
        author_repo.run_migrations();
        let mut author_service = AuthorService::new(author_repo);

        let author1 = author_service.create(new_author_dto_factory("Test Author 1".to_string()));
        let author2 = author_service.create(new_author_dto_factory("Test Author 2".to_string()));

        let author_list = author_service.all();

        assert!(author_list.is_ok());
        let unwrapped = author_list.unwrap();
        assert_eq!(unwrapped.len(), 2);
        assert_eq!(unwrapped.clone()[0].name, "Test Author 1");
        assert_eq!(unwrapped.clone()[0].id, author1.unwrap().id);
        assert_eq!(unwrapped.clone()[1].name, "Test Author 2");
        assert_eq!(unwrapped.clone()[1].id, author2.unwrap().id);
    }
}
