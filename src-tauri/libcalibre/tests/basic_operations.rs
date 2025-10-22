//! Integration tests for basic CRUD operations.

mod common;

use common::*;
use diesel::prelude::*;
use libcalibre::schema::*;
use libcalibre::types::{AuthorId, BookId};

#[test]
fn test_create_and_find_book() {
    let mut conn = setup_test_db();

    // Create a book
    let book_id = create_test_book(&mut conn, "The Great Gatsby");

    // Find the book
    let found: Option<String> = books::table
        .filter(books::id.eq(book_id.as_i32()))
        .select(books::title)
        .first(&mut conn)
        .optional()
        .unwrap();

    assert_eq!(found, Some("The Great Gatsby".to_string()));
}

#[test]
fn test_create_and_find_author() {
    let mut conn = setup_test_db();

    // Create an author
    let author_id = create_test_author(&mut conn, "F. Scott Fitzgerald");

    // Find the author
    let found: Option<String> = authors::table
        .filter(authors::id.eq(author_id.as_i32()))
        .select(authors::name)
        .first(&mut conn)
        .optional()
        .unwrap();

    assert_eq!(found, Some("F. Scott Fitzgerald".to_string()));
}

#[test]
fn test_link_author_to_book() {
    let mut conn = setup_test_db();

    // Create book and author
    let book_id = create_test_book(&mut conn, "1984");
    let author_id = create_test_author(&mut conn, "George Orwell");

    // Link them
    link_author_to_book(&mut conn, book_id, author_id);

    // Verify link exists
    let link_exists: bool = books_authors_link::table
        .filter(books_authors_link::book.eq(book_id.as_i32()))
        .filter(books_authors_link::author.eq(author_id.as_i32()))
        .count()
        .get_result::<i64>(&mut conn)
        .map(|count| count > 0)
        .unwrap();

    assert!(link_exists);
}

#[test]
fn test_update_book_title() {
    let mut conn = setup_test_db();

    // Create a book
    let book_id = create_test_book(&mut conn, "Original Title");

    // Update the title
    diesel::update(books::table.filter(books::id.eq(book_id.as_i32())))
        .set(books::title.eq("Updated Title"))
        .execute(&mut conn)
        .unwrap();

    // Verify update
    let updated_title: String = books::table
        .filter(books::id.eq(book_id.as_i32()))
        .select(books::title)
        .first(&mut conn)
        .unwrap();

    assert_eq!(updated_title, "Updated Title");
}

#[test]
fn test_delete_book() {
    let mut conn = setup_test_db();

    // Create a book
    let book_id = create_test_book(&mut conn, "Book to Delete");

    // Delete it
    diesel::delete(books::table.filter(books::id.eq(book_id.as_i32())))
        .execute(&mut conn)
        .unwrap();

    // Verify it's gone
    let found: Option<String> = books::table
        .filter(books::id.eq(book_id.as_i32()))
        .select(books::title)
        .first(&mut conn)
        .optional()
        .unwrap();

    assert_eq!(found, None);
}

#[test]
fn test_find_books_by_author() {
    let mut conn = setup_test_db();

    // Create an author and multiple books
    let author_id = create_test_author(&mut conn, "Jane Austen");
    let book1_id = create_test_book(&mut conn, "Pride and Prejudice");
    let book2_id = create_test_book(&mut conn, "Sense and Sensibility");

    // Link author to both books
    link_author_to_book(&mut conn, book1_id, author_id);
    link_author_to_book(&mut conn, book2_id, author_id);

    // Find all books by this author
    let book_ids: Vec<i32> = books_authors_link::table
        .filter(books_authors_link::author.eq(author_id.as_i32()))
        .select(books_authors_link::book)
        .load(&mut conn)
        .unwrap();

    assert_eq!(book_ids.len(), 2);
    assert!(book_ids.contains(&book1_id.as_i32()));
    assert!(book_ids.contains(&book2_id.as_i32()));
}

#[test]
fn test_add_book_description() {
    let mut conn = setup_test_db();

    // Create a book
    let book_id = create_test_book(&mut conn, "Test Book");

    // Add description
    diesel::insert_into(comments::table)
        .values((
            comments::book.eq(book_id.as_i32()),
            comments::text.eq("This is a test description."),
        ))
        .execute(&mut conn)
        .unwrap();

    // Verify description
    let description: String = comments::table
        .filter(comments::book.eq(book_id.as_i32()))
        .select(comments::text)
        .first(&mut conn)
        .unwrap();

    assert_eq!(description, "This is a test description.");
}

#[test]
fn test_add_book_identifier() {
    let mut conn = setup_test_db();

    // Create a book
    let book_id = create_test_book(&mut conn, "Test Book");

    // Add ISBN
    diesel::insert_into(identifiers::table)
        .values((
            identifiers::book.eq(book_id.as_i32()),
            identifiers::type_.eq("isbn"),
            identifiers::val.eq("978-0-123456-78-9"),
        ))
        .execute(&mut conn)
        .unwrap();

    // Verify identifier
    let isbn: String = identifiers::table
        .filter(identifiers::book.eq(book_id.as_i32()))
        .filter(identifiers::type_.eq("isbn"))
        .select(identifiers::val)
        .first(&mut conn)
        .unwrap();

    assert_eq!(isbn, "978-0-123456-78-9");
}

#[test]
fn test_multiple_authors_per_book() {
    let mut conn = setup_test_db();

    // Create a book and two authors
    let book_id = create_test_book(&mut conn, "Collaborative Work");
    let author1_id = create_test_author(&mut conn, "Author One");
    let author2_id = create_test_author(&mut conn, "Author Two");

    // Link both authors to the book
    link_author_to_book(&mut conn, book_id, author1_id);
    link_author_to_book(&mut conn, book_id, author2_id);

    // Verify both links exist
    let author_count: i64 = books_authors_link::table
        .filter(books_authors_link::book.eq(book_id.as_i32()))
        .count()
        .get_result(&mut conn)
        .unwrap();

    assert_eq!(author_count, 2);
}

#[test]
fn test_unique_constraint_on_book_author_link() {
    let mut conn = setup_test_db();

    let book_id = create_test_book(&mut conn, "Test Book");
    let author_id = create_test_author(&mut conn, "Test Author");

    // First link should succeed
    link_author_to_book(&mut conn, book_id, author_id);

    // Second link should fail (duplicate)
    let result = diesel::insert_into(books_authors_link::table)
        .values((
            books_authors_link::book.eq(book_id.as_i32()),
            books_authors_link::author.eq(author_id.as_i32()),
        ))
        .execute(&mut conn);

    assert!(result.is_err());
}

#[test]
fn test_list_all_books() {
    let mut conn = setup_test_db();

    // Create multiple books
    create_test_book(&mut conn, "Book 1");
    create_test_book(&mut conn, "Book 2");
    create_test_book(&mut conn, "Book 3");

    // List all books
    let all_titles: Vec<String> = books::table.select(books::title).load(&mut conn).unwrap();

    assert_eq!(all_titles.len(), 3);
    assert!(all_titles.contains(&"Book 1".to_string()));
    assert!(all_titles.contains(&"Book 2".to_string()));
    assert!(all_titles.contains(&"Book 3".to_string()));
}

#[test]
fn test_list_all_authors() {
    let mut conn = setup_test_db();

    // Create multiple authors
    create_test_author(&mut conn, "Author A");
    create_test_author(&mut conn, "Author B");
    create_test_author(&mut conn, "Author C");

    // List all authors
    let all_names: Vec<String> = authors::table
        .select(authors::name)
        .load(&mut conn)
        .unwrap();

    assert_eq!(all_names.len(), 3);
    assert!(all_names.contains(&"Author A".to_string()));
    assert!(all_names.contains(&"Author B".to_string()));
    assert!(all_names.contains(&"Author C".to_string()));
}
