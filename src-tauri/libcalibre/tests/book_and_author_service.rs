// #[cfg(test)]
// mod book_and_author_service_tests {
//     use std::sync::{Arc, Mutex};

//     use libcalibre::{
//         application::services::domain::{
//             author::dto::NewAuthorDto,
//             book::dto::NewBookDto,
//             library::service::LibraryService,
//             file::{dto::NewFileDto, service::BookFileService},
//         },
//         infrastructure::domain::{
//             author::repository::AuthorRepository, book::repository::BookRepository,
//             book_file::repository::BookFileRepository,
//         },
//     };

//     fn setup() -> (
//         Arc<Mutex<BookRepository>>,
//         Arc<Mutex<AuthorRepository>>,
//         Arc<Mutex<BookFileRepository>>,
//     ) {
//         let connection_url = "file::memory:?cache=shared";
//         let book_repo = Arc::new(Mutex::new(BookRepository::new(connection_url)));
//         let author_repo = Arc::new(Mutex::new(AuthorRepository::new(connection_url)));
//         let file_repo = Arc::new(Mutex::new(BookFileRepository::new(connection_url)));
//         // Run migrations for the schema: affects all Repos
//         let book_repo_clone = book_repo.clone();
//         let mut book_repo_guard = book_repo_clone.lock().unwrap();
//         book_repo_guard.run_migrations();
//         // author_repo.run_migrations();

//         (book_repo, author_repo, file_repo)
//     }

//     fn new_book_dto_factory(title: String) -> NewBookDto {
//         NewBookDto {
//             title,
//             author_list: vec!["Logic".to_string()],
//             timestamp: None,
//             pubdate: None,
//             series_index: 1.0,
//             isbn: None,
//             lccn: None,
//             flags: 1,
//             has_cover: Some(false),
//         }
//     }

//     fn new_author_dto_factory(name: String) -> NewAuthorDto {
//         NewAuthorDto {
//             full_name: name.clone(),
//             sortable_name: name,
//             external_url: None,
//         }
//     }

//     fn new_file_dto_factory(book_id: i32, name: String) -> NewFileDto {
//         NewFileDto {
//             book_id,
//             name_without_extension: name,
//             file_size_bytes: 789421,
//             file_format: "EPUB".to_string(),
//         }
//     }

//     #[test]
//     fn add_book_with_authors() {
//         let (book_repo, author_repo, file_repo) = setup();
//         let mut book_and_author_service =
//             LibraryService::new(book_repo, author_repo, file_repo.clone());
//         let file_service = BookFileService::new(file_repo);

//         let ex_book = new_book_dto_factory("Test Book 1".to_string());
//         let ex_author = new_author_dto_factory("Porter Robinson".to_string());

//         let created = book_and_author_service
//             .create(ex_book, vec![ex_author])
//             .unwrap();

//         // Verify that returned object has right data
//         assert_eq!(created.book.title, "Test Book 1");
//         assert_eq!(created.authors.len(), 1);
//         assert_eq!(created.authors[0].name, "Porter Robinson");

//         // Create new book for file, to ensure we get that back in the lookup
//         let ex_file = new_file_dto_factory(created.book.id, "Filename1".to_string());
//         let _ = file_service.create(ex_file);

//         // Verify we can get that book & author from the database by book ID
//         let result_from_db = book_and_author_service
//             .find_book_with_authors(created.book.id)
//             .unwrap();

//         assert_eq!(result_from_db.book.title, "Test Book 1");

//         assert_eq!(result_from_db.authors.len(), 1);
//         assert_eq!(result_from_db.authors[0].name, "Porter Robinson");

//         assert_eq!(result_from_db.files.len(), 1);
//         assert_eq!(result_from_db.files[0].name, "Filename1")
//     }
// }
