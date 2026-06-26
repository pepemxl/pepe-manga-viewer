// The React UI is a pure client of the FastAPI backend (configurable in
// Settings → Server). The Rust shell hosts the webview and additionally provides
// an on-disk image cache: pages downloaded from a provider's API are written to
//
//     <storage_root>/<provider>/<manga_name>/chapter_<n>/<page>.<ext>
//
// so subsequent reads come straight off disk (and work offline). The cached
// files are surfaced back to the webview through Tauri's `asset:` protocol.

use std::fs;
use std::path::{Path, PathBuf};

use tauri::Manager;

/// Strip characters that are illegal in path components on Windows/macOS/Linux
/// so a provider / manga / chapter label can be used as a folder name.
fn sanitize(component: &str) -> String {
    let cleaned: String = component
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 0x20 => '_',
            c => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').trim();
    if trimmed.is_empty() {
        "_".to_string()
    } else {
        trimmed.to_string()
    }
}

/// `<root>/<provider>/<manga>/<chapter>` with each component sanitized.
fn chapter_dir(root: &str, provider: &str, manga: &str, chapter: &str) -> PathBuf {
    Path::new(root)
        .join(sanitize(provider))
        .join(sanitize(manga))
        .join(sanitize(chapter))
}

/// Map an HTTP `Content-Type` to a sensible image extension.
fn ext_for_mime(mime: &str) -> &'static str {
    match mime.split(';').next().unwrap_or("").trim() {
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "image/avif" => "avif",
        "image/bmp" => "bmp",
        "image/jpeg" | "image/jpg" => "jpg",
        _ => "jpg",
    }
}

/// Look for an already-cached page file `<page:04>.*` inside `dir`.
fn find_cached(dir: &Path, page: u32) -> Option<PathBuf> {
    let stem = format!("{page:04}");
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
            if name == stem && path.is_file() {
                return Some(path);
            }
        }
    }
    None
}

/// Default cache location: `<app_data_dir>/local_storage`.
#[tauri::command]
fn default_storage_root(app: tauri::AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("local_storage").to_string_lossy().into_owned())
}

/// Grant the `asset:` protocol read access to the chosen cache root (recursive)
/// so cached files can be displayed via `convertFileSrc`. Idempotent.
#[tauri::command]
fn allow_storage(app: tauri::AppHandle, root: String) -> Result<(), String> {
    if root.trim().is_empty() {
        return Ok(());
    }
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    app.asset_protocol_scope()
        .allow_directory(&root, true)
        .map_err(|e| e.to_string())
}

/// Return the absolute path of a cached page, or `None` if it isn't cached yet.
#[tauri::command]
fn cached_page(
    root: String,
    provider: String,
    manga: String,
    chapter: String,
    page: u32,
) -> Option<String> {
    let dir = chapter_dir(&root, &provider, &manga, &chapter);
    find_cached(&dir, page).map(|p| p.to_string_lossy().into_owned())
}

/// Ensure a page is cached: if already on disk return its path, otherwise
/// download `url` and write it under the cache layout, returning the new path.
#[tauri::command]
async fn cache_page(
    root: String,
    provider: String,
    manga: String,
    chapter: String,
    page: u32,
    url: String,
) -> Result<String, String> {
    let dir = chapter_dir(&root, &provider, &manga, &chapter);
    if let Some(existing) = find_cached(&dir, page) {
        return Ok(existing.to_string_lossy().into_owned());
    }

    let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("download failed: HTTP {}", resp.status()));
    }
    let mime = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();
    let ext = ext_for_mime(&mime);
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{page:04}.{ext}"));
    // Write to a temp file then rename so a partial download never looks cached.
    let tmp = dir.join(format!("{page:04}.{ext}.part"));
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            default_storage_root,
            allow_storage,
            cached_page,
            cache_page,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
