use serde::{Serialize};

#[tauri::command]
#[specta::specta]
pub fn some_struct() -> ExStruct {
    ExStruct {
        some_field: "Hello World".into(),
    }
}

#[derive(Serialize, specta::Type)] // For Specta support you must add the `specta::Type` derive macro.
pub struct ExStruct {
    some_field: String,
}

#[tauri::command]
#[specta::specta]
pub fn hello_world(my_name: String) -> String {
    format!("Hello, {my_name}! You've been greeted from Rust!")
}