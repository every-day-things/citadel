use std::fs;
use std::io;
use std::path::Path;
use std::path::PathBuf;

pub trait FileServiceTrait {
    fn new(library_root: &String) -> Self;
    /// Create a directory relative to the Library Root.
    fn create_directory(&self, path: PathBuf) -> io::Result<()>;
    /// Copy a file to a directory within the Library Root.
    fn copy_file_to_directory(&self, source: &Path, destination: &Path) -> io::Result<()>;
}

pub struct FileService {
    library_root: String,
}

impl FileServiceTrait for FileService {
    fn new(library_root: &String) -> Self {
        Self { library_root: library_root.clone() }
    }

    fn create_directory(&self, library_relative_path: PathBuf) -> io::Result<()> {
        let complete_path = Path::new(&self.library_root).join(library_relative_path);

        if !complete_path.exists() {
            fs::create_dir_all(complete_path)?;
        }
        Ok(())
    }

    fn copy_file_to_directory(&self, source_abs: &Path, destination_rel: &Path) -> io::Result<()> {
        if !source_abs.exists() {
            return Err(io::Error::new(
                io::ErrorKind::NotFound,
                format!("Source file does not exist: {:?}", source_abs),
            ));
        }

        let complete_destination = Path::new(&self.library_root).join(destination_rel);
        fs::copy(source_abs, complete_destination)?;
        Ok(())
    }
}
