use std::path::Path;

pub(super) fn trash_book_dir(
    library_root: &Path,
    dir: &Path,
    trash: impl FnOnce(&Path) -> Result<(), String>,
) -> Result<bool, String> {
    let root = library_root
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let relative = dir
        .strip_prefix(&root)
        .map_err(|_| "The book folder is outside the library")?;
    let components: Vec<_> = relative.components().collect();
    if components.len() < 2
        || components
            .iter()
            .any(|part| !matches!(part, std::path::Component::Normal(_)))
    {
        return Err("The book folder is not a safe book directory".into());
    }
    let mut current = root.clone();
    for component in components {
        current.push(component.as_os_str());
        let metadata = match std::fs::symlink_metadata(&current) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
            Err(error) => return Err(error.to_string()),
        };
        if !metadata.is_dir() || metadata.file_type().is_symlink() {
            return Err("The book folder changed or contains a symbolic link".into());
        }
    }
    let canonical = dir.canonicalize().map_err(|error| error.to_string())?;
    if canonical == root || !canonical.starts_with(&root) {
        return Err("The book folder changed or is outside the library".into());
    }
    trash(dir)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static NEXT: AtomicUsize = AtomicUsize::new(0);
    struct TestLibrary(std::path::PathBuf);
    impl TestLibrary {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!(
                "citadel-trash-test-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            std::fs::create_dir_all(root.join("Author/Book")).unwrap();
            Self(root.canonicalize().unwrap())
        }
        fn book(&self) -> std::path::PathBuf {
            self.0.join("Author/Book")
        }
    }
    impl Drop for TestLibrary {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn trash_failure_is_reported_and_files_remain() {
        let lib = TestLibrary::new();
        std::fs::write(lib.book().join("book.epub"), "content").unwrap();
        let result = trash_book_dir(&lib.0, &lib.book(), |_| {
            Err("Permission denied by Trash".into())
        });
        assert_eq!(result.unwrap_err(), "Permission denied by Trash");
        assert!(lib.book().join("book.epub").exists());
    }

    #[test]
    fn missing_folder_does_not_call_trash() {
        let lib = TestLibrary::new();
        let result = trash_book_dir(&lib.0, &lib.0.join("Author/Missing"), |_| {
            panic!("missing folder must not be trashed")
        });
        assert!(!result.unwrap());
    }

    #[test]
    fn library_root_cannot_be_trashed() {
        let lib = TestLibrary::new();
        assert!(trash_book_dir(&lib.0, &lib.0, |_| panic!("root must not be trashed")).is_err());
    }

    #[test]
    fn successful_move_is_reported() {
        let lib = TestLibrary::new();
        assert!(trash_book_dir(&lib.0, &lib.book(), |path| {
            std::fs::rename(path, lib.0.join("test-trash")).map_err(|e| e.to_string())
        })
        .unwrap());
        assert!(!lib.book().exists());
        assert!(lib.0.join("test-trash").is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn changed_symlink_ancestor_is_not_followed() {
        let lib = TestLibrary::new();
        let outside = TestLibrary::new();
        std::fs::remove_dir_all(lib.0.join("Author")).unwrap();
        std::os::unix::fs::symlink(outside.0.join("Author"), lib.0.join("Author")).unwrap();
        assert!(trash_book_dir(&lib.0, &lib.book(), |_| panic!(
            "symlink must not be followed"
        ))
        .is_err());
        assert!(outside.book().is_dir());
    }

    #[cfg(unix)]
    #[test]
    fn access_errors_are_reported_instead_of_skipped() {
        use std::os::unix::fs::PermissionsExt;
        let lib = TestLibrary::new();
        let author = lib.0.join("Author");
        std::fs::set_permissions(&author, std::fs::Permissions::from_mode(0)).unwrap();
        let result = trash_book_dir(&lib.0, &lib.book(), |_| {
            panic!("inaccessible path must not reach trash")
        });
        std::fs::set_permissions(&author, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert!(result.is_err());
    }
}
