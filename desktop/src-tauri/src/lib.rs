// The React UI is a pure client of the FastAPI backend (configurable in
// Settings → Server), so the Rust shell stays thin: it just hosts the webview.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
