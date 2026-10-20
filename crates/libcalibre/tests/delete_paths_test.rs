#[allow(dead_code, unused_imports)]
mod common;
use diesel::sql_types::{Integer, Text};
use diesel::{sql_query, RunQueryDsl};
use libcalibre::{BookId, Library};

fn set_path(lib: &Library, id: BookId, path: &str) {
    let mut conn = libcalibre::persistence::establish_connection(lib.database_path()).unwrap();
    sql_query("UPDATE books SET path = ? WHERE id = ?")
        .bind::<Text, _>(path)
        .bind::<Integer, _>(id.as_i32())
        .execute(&mut conn)
        .unwrap();
}

#[test]
fn unsafe_paths_reject_the_entire_batch_before_deletion() {
    for path in [
        "",
        ".",
        "..",
        "Author/../../outside",
        "/tmp/unrelated",
        "Author",
    ] {
        let (_temp, mut lib) = common::setup_with_library();
        let first = lib.add_book(common::standard_test_book()).unwrap();
        let second = lib.add_book(common::standard_test_book()).unwrap();
        set_path(&lib, second.id, path);
        assert!(
            lib.delete_books(&[first.id, second.id]).is_err(),
            "accepted {path:?}"
        );
        assert!(lib.get_book(first.id).is_ok());
        assert!(lib.get_book(second.id).is_ok());
    }
}

#[test]
fn missing_folder_can_still_be_removed_from_catalog() {
    let (temp, mut lib) = common::setup_with_library();
    let book = lib.add_book(common::standard_test_book()).unwrap();
    set_path(&lib, book.id, "Missing/Book (1)");
    let paths = lib.delete_books(&[book.id]).unwrap();
    assert_eq!(
        paths,
        [temp.path().canonicalize().unwrap().join("Missing/Book (1)")]
    );
    assert!(lib.get_book(book.id).is_err());
}

#[cfg(unix)]
#[test]
fn rejects_symlink_ancestors_and_book_folders() {
    use std::os::unix::fs::symlink;
    for parent_link in [false, true] {
        let (temp, mut lib) = common::setup_with_library();
        let outside = tempfile::tempdir().unwrap();
        std::fs::write(outside.path().join("untouched"), "safe").unwrap();
        let book = lib.add_book(common::standard_test_book()).unwrap();
        if parent_link {
            symlink(outside.path(), temp.path().join("Link")).unwrap();
        } else {
            std::fs::create_dir(temp.path().join("Link")).unwrap();
            symlink(outside.path(), temp.path().join("Link/Book")).unwrap();
        }
        set_path(&lib, book.id, "Link/Book");
        assert!(lib.delete_books(&[book.id]).is_err());
        assert!(lib.get_book(book.id).is_ok());
        assert!(outside.path().join("untouched").exists());
    }
}

#[cfg(unix)]
#[test]
fn inaccessible_folder_preserves_records() {
    use std::os::unix::fs::PermissionsExt;
    let (temp, mut lib) = common::setup_with_library();
    let book = lib.add_book(common::standard_test_book()).unwrap();
    let author = temp.path().join("Blocked");
    std::fs::create_dir_all(author.join("Book")).unwrap();
    set_path(&lib, book.id, "Blocked/Book");
    std::fs::set_permissions(&author, std::fs::Permissions::from_mode(0)).unwrap();
    let result = lib.delete_books(&[book.id]);
    std::fs::set_permissions(&author, std::fs::Permissions::from_mode(0o700)).unwrap();
    assert!(result.is_err());
    assert!(lib.get_book(book.id).is_ok());
}
