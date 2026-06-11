use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

#[cfg(target_os = "macos")]
use tauri::{
    menu::{AboutMetadataBuilder, Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};

#[cfg(target_os = "macos")]
const MENU_ID_SETTINGS: &str = "settings";
#[cfg(target_os = "macos")]
const MENU_ID_ADD_BOOK: &str = "add-book";

/// Emitted to the main window when File > Add Book… is chosen; the frontend
/// listens for this and starts the same flow as the toolbar + button.
#[cfg(target_os = "macos")]
const EVENT_MENU_ADD_BOOK: &str = "menu://add-book";

/// Builds the standard macOS menu bar: app menu (About, Settings…, Services,
/// Hide, Quit), File, Edit (required for ⌘C/⌘V to reach text fields), View,
/// and Window.
#[cfg(target_os = "macos")]
pub fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let app_name = app.package_info().name.clone();

    let about_metadata = AboutMetadataBuilder::new()
        .name(Some(app_name.clone()))
        .version(Some(app.package_info().version.to_string()))
        .build();

    let app_menu = Submenu::with_items(
        app,
        &app_name,
        true,
        &[
            &PredefinedMenuItem::about(
                app,
                Some(&format!("About {app_name}")),
                Some(about_metadata),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(
                app,
                MENU_ID_SETTINGS,
                "Settings…",
                true,
                Some("CmdOrCtrl+,"),
            )?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, Some(&format!("Hide {app_name}")))?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some(&format!("Quit {app_name}")))?,
        ],
    )?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, MENU_ID_ADD_BOOK, "Add Book…", true, Some("CmdOrCtrl+N"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(app, None)?],
    )?;

    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;
    window_menu.set_as_windows_menu_for_nsapp()?;

    Menu::with_items(
        app,
        &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu],
    )
}

#[cfg(target_os = "macos")]
pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match event.id().as_ref() {
        MENU_ID_SETTINGS => open_settings_window(app),
        MENU_ID_ADD_BOOK => {
            let _ = app.emit_to("main", EVENT_MENU_ADD_BOOK, ());
        }
        _ => {}
    }
}

/// Opens the dedicated settings window, or focuses it if it is already open.
/// Window options live here (not in tauri.conf.json) so the menu can open the
/// window even before any frontend has loaded.
pub fn open_settings_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.set_focus();
        return;
    }

    // In dev, join the Vite dev server URL explicitly; WebviewUrl::App's
    // dev-url resolution proved unreliable for secondary windows (the webview
    // came up blank). In release, App URLs serve the bundled assets.
    let url = match app.config().build.dev_url.clone() {
        Some(dev_url) => match dev_url.join("settings") {
            Ok(joined) => WebviewUrl::External(joined),
            Err(_) => WebviewUrl::App("/settings".into()),
        },
        None => WebviewUrl::App("/settings".into()),
    };

    let builder = WebviewWindowBuilder::new(app, "settings", url)
        .title("Settings")
        .inner_size(680.0, 480.0)
        .resizable(false)
        .minimizable(false)
        .center();

    // NOTE: overlay title bar + transparent + sidebar effects left off for
    // now — with them, the settings webview came up blank (debugging round
    // 5). Plain window first; re-add the glass once the cause is found.

    if let Err(err) = builder.build() {
        log::error!("Failed to open settings window: {err}");
    }
}

#[tauri::command]
#[specta::specta]
pub fn clb_cmd_open_settings(app: AppHandle) {
    open_settings_window(&app);
}
