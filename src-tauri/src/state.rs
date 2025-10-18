use std::sync::Mutex;

use libcalibre::calibre_client::CalibreClient;

pub struct CitadelState {
    client: Mutex<Option<CalibreClient>>,
    current_library_path: Mutex<Option<String>>,
}

impl CitadelState {
    pub fn new() -> Self {
        Self {
            client: Mutex::new(None),
            current_library_path: Mutex::new(None),
        }
    }

    /// Initialize or switch to a library
    pub fn init_library(&self, library_path: String) -> Result<(), String> {
        let db_path = libcalibre::util::get_db_path(&library_path)
            .ok_or_else(|| format!("Invalid library path: {}", library_path))?;

        let client = CalibreClient::new(db_path);

        *self.client.lock().unwrap() = Some(client);
        *self.current_library_path.lock().unwrap() = Some(library_path);

        Ok(())
    }

    /// Execute a function with mutable access to the client
    pub fn with_client<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut CalibreClient) -> R,
    {
        let mut client_guard = self.client.lock().unwrap();
        match client_guard.as_mut() {
            Some(client) => Ok(f(client)),
            None => Err("No library initialized. Please load a library first.".to_string()),
        }
    }

    /// Get the current library path
    pub fn get_library_path(&self) -> Option<String> {
        self.current_library_path.lock().unwrap().clone()
    }

    /// Check if a library is currently loaded
    pub fn is_initialized(&self) -> bool {
        self.client.lock().unwrap().is_some()
    }
}
