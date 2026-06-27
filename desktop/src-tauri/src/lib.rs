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

// ── local library import ────────────────────────────────────────────────────
// A picked folder becomes a local-only series. Each `.cbz`/`.zip` archive and
// each image sub-folder inside it is a chapter; loose images directly in the
// folder form a single chapter. Pages are extracted/copied into
// `<root>/_local/<series_id>/<chapter_id>/page_XXXX.ext` so local content lives
// alongside the cache and reuses the same `asset:`-protocol reader path.

#[derive(serde::Serialize)]
struct LocalChapter {
    id: String,
    title: String,
    number: String,
    pages: Vec<String>,
}

#[derive(serde::Serialize)]
struct LocalSeries {
    id: String,
    title: String,
    chapters: Vec<LocalChapter>,
    /// Sources we couldn't import yet (e.g. .cbr / .pdf on desktop).
    skipped: Vec<String>,
}

fn is_image(name: &str) -> bool {
    let ext = name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    matches!(ext.as_str(), "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "avif")
}

fn img_ext(name: &str) -> String {
    let ext = name.rsplit('.').next().unwrap_or("jpg").to_ascii_lowercase();
    if ext.len() <= 5 && ext.chars().all(|c| c.is_ascii_alphanumeric()) { ext } else { "jpg".into() }
}

fn short_hash(s: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    s.hash(&mut h);
    format!("{:08x}", h.finish() as u32)
}

/// Extract image entries of a zip/cbz into `out_dir` as page_0001.ext, sorted by name.
fn extract_zip(src: &Path, out_dir: &Path) -> Result<Vec<String>, String> {
    let file = fs::File::open(src).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut names: Vec<String> = (0..zip.len())
        .filter_map(|i| zip.by_index(i).ok().filter(|f| f.is_file()).map(|f| f.name().to_string()))
        .filter(|n| is_image(n))
        .collect();
    names.sort();
    fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;
    let mut pages = Vec::new();
    for (idx, name) in names.iter().enumerate() {
        let mut entry = zip.by_name(name).map_err(|e| e.to_string())?;
        let out = out_dir.join(format!("page_{:04}.{}", idx + 1, img_ext(name)));
        let mut w = fs::File::create(&out).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut w).map_err(|e| e.to_string())?;
        pages.push(out.to_string_lossy().into_owned());
    }
    Ok(pages)
}

/// Copy image files from a directory into `out_dir` as page_0001.ext, sorted by name.
fn copy_image_dir(src: &Path, out_dir: &Path) -> Result<Vec<String>, String> {
    let mut names: Vec<String> = fs::read_dir(src)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| e.path().is_file())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| is_image(n))
        .collect();
    names.sort();
    if names.is_empty() {
        return Ok(Vec::new());
    }
    fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;
    let mut pages = Vec::new();
    for (idx, name) in names.iter().enumerate() {
        let out = out_dir.join(format!("page_{:04}.{}", idx + 1, img_ext(name)));
        fs::copy(src.join(name), &out).map_err(|e| e.to_string())?;
        pages.push(out.to_string_lossy().into_owned());
    }
    Ok(pages)
}

fn import_blocking(root: &str, path: &str) -> Result<LocalSeries, String> {
    let src = Path::new(path);
    let title = src.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| "Local".into());
    let series_id = format!("{}-{}", sanitize(&title), short_hash(path));
    let series_dir = Path::new(root).join("_local").join(&series_id);

    // Gather candidate chapter sources: archives, image sub-folders, and loose images.
    let mut entries: Vec<PathBuf> = fs::read_dir(src)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|e| e.path())
        .collect();
    entries.sort();

    let mut chapters = Vec::new();
    let mut skipped = Vec::new();
    let mut loose_images = false;

    for entry in &entries {
        let name = entry.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
        if entry.is_dir() {
            let cid = sanitize(&name);
            let pages = copy_image_dir(entry, &series_dir.join(&cid))?;
            if !pages.is_empty() {
                chapters.push(LocalChapter { id: cid, title: name.clone(), number: name, pages });
            }
        } else if entry.is_file() {
            let ext = name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
            match ext.as_str() {
                "cbz" | "zip" => {
                    let cid = sanitize(name.trim_end_matches(&format!(".{ext}")));
                    let pages = extract_zip(entry, &series_dir.join(&cid))?;
                    if !pages.is_empty() {
                        let stem = name.trim_end_matches(&format!(".{ext}")).to_string();
                        chapters.push(LocalChapter { id: cid, title: stem.clone(), number: stem, pages });
                    }
                }
                "cbr" | "rar" | "pdf" => skipped.push(name),
                _ if is_image(&name) => loose_images = true,
                _ => {}
            }
        }
    }

    // Loose images directly in the folder → one chapter named after the folder.
    if loose_images {
        let cid = "chapter".to_string();
        let pages = copy_image_dir(src, &series_dir.join(&cid))?;
        if !pages.is_empty() {
            chapters.push(LocalChapter { id: cid, title: title.clone(), number: "1".into(), pages });
        }
    }

    if chapters.is_empty() {
        return Err(if skipped.is_empty() {
            "No readable images found in that folder.".into()
        } else {
            format!("Only unsupported files found ({}). CBR/PDF aren't supported on desktop yet.", skipped.join(", "))
        });
    }

    Ok(LocalSeries { id: series_id, title, chapters, skipped })
}

/// Import a picked folder as a local series (heavy I/O off the UI thread).
#[tauri::command]
async fn import_local_series(root: String, path: String) -> Result<LocalSeries, String> {
    if root.trim().is_empty() {
        return Err("storage root not set".into());
    }
    tauri::async_runtime::spawn_blocking(move || import_blocking(&root, &path))
        .await
        .map_err(|e| e.to_string())?
}

/// Delete a local series' extracted files. Best-effort.
#[tauri::command]
fn delete_local_series(root: String, series_id: String) -> Result<(), String> {
    let dir = Path::new(&root).join("_local").join(sanitize(&series_id));
    if dir.exists() {
        fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(())
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
            import_local_series,
            delete_local_series,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
