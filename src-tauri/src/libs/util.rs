use std::path::Path;

/// Converts an absolute file path to a URL that can be used by a Tauri frontend.
pub fn path_to_asset_url(file_path: &Path) -> String {
    let os_name = std::env::consts::OS;
    let protocol = "asset";
    let path = urlencoding::encode(file_path.to_str().unwrap());
    if os_name == "windows" || os_name == "android" {
        format!("http://{}.localhost/{}", protocol, path)
    } else {
        format!("{}://localhost/{}", protocol, path)
    }
}