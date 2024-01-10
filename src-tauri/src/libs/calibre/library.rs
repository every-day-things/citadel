pub fn gen_database_path(library_root: &str) -> String {
  // TODO: Move this to `libcalibre`.
  format!("{}/metadata.db", library_root)
}