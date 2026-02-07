use std::sync::Mutex;

use libcalibre::Library;

pub struct CitadelState {
    library: Mutex<Option<Library>>,
    current_library_path: Mutex<Option<String>>,
}

impl CitadelState {
    pub fn new() -> Self {
        Self {
            library: Mutex::new(None),
            current_library_path: Mutex::new(None),
        }
    }

    /// Initialize or switch to a library
    pub fn init_library(&self, library_path: String) -> Result<(), String> {
        let db_path = libcalibre::util::get_db_path(&library_path)
            .ok_or_else(|| format!("Invalid library path: {}", library_path))?;

        let lib = Library::new(db_path).map_err(|e| format!("Failed to open library: {}", e))?;

        *self.library.lock().expect("Library mutex poisoned") = Some(lib);
        *self
            .current_library_path
            .lock()
            .expect("Library path mutex poisoned") = Some(library_path);

        Ok(())
    }

    /// Execute a function with mutable access to the library
    pub fn with_library<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut Library) -> R,
    {
        let mut lib_guard = self.library.lock().expect("Library mutex poisoned");
        match lib_guard.as_mut() {
            Some(lib) => Ok(f(lib)),
            None => Err("No library initialized. Please load a library first.".to_string()),
        }
    }

    /// Get the current library path
    pub fn get_library_path(&self) -> Option<String> {
        self.current_library_path
            .lock()
            .expect("Library path mutex poisoned")
            .clone()
    }

    /// Check if a library is currently loaded
    pub fn is_initialized(&self) -> bool {
        self.library.lock().expect("Library mutex poisoned").is_some()
    }
}
