// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod libs {
  pub mod calibre;
}

mod book;

#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}!", name)
}

fn main() {
  let specta_builder = {
    // You can use `tauri_specta::js::builder` for exporting JS Doc instead of Typescript!`
    let specta_builder = tauri_specta::ts::builder()
        .commands(tauri_specta::collect_commands![book::hello_world, book::some_struct, libs::calibre::load_books_from_db]); // <- Each of your comments


    #[cfg(debug_assertions)] // <- Only export on non-release builds
    let specta_builder = specta_builder.path("../src/bindings.ts");

    specta_builder.into_plugin()
  };

  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet])
    .plugin(specta_builder)
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
