// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod libs {
  pub mod calibre;
}

#[tauri::command]
fn greet(name: &str) -> String {
  let x = libs::calibre::add(4, 8);
  format!("Hello, {}!{x}", name)
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
