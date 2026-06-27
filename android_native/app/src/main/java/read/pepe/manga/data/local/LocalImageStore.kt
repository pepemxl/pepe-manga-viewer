package read.pepe.manga.data.local

import java.io.File

/**
 * Reference to a single chapter page, carrying everything needed both to fetch
 * it from the API and to mirror it on disk under
 * `<root>/<provider>/<manga>/<chapter>/<fileName>`.
 *
 * Used as the Coil model so [LocalPageFetcher] can serve it local-first.
 */
data class PageRef(
    /** Absolute API URL for the page. */
    val url: String,
    /** Backend provider name — e.g. `pepe_manga_server`. */
    val provider: String,
    /** Series / manga name (folder). */
    val manga: String,
    /** Chapter number or label (folder). */
    val chapter: String,
    /** Page file name within the chapter folder, e.g. `page_001.jpg`. */
    val fileName: String,
)

/**
 * Resolves [PageRef]s to local files and derives stable page file names. The
 * layout mirrors the requested scheme: `local_storage/<provider>/<manga>/<chapter>/`.
 */
object LocalImageStore {

    /** Provider folder for the current FastAPI backend. */
    const val PROVIDER = "pepe_manga_server"

    /** Provider folder for imported local-only content (`<root>/_local/...`). */
    const val LOCAL_PROVIDER = "_local"

    /** `<root>/<provider>/<manga>/<chapter>/<fileName>`, each segment sanitized. */
    fun fileFor(root: String, ref: PageRef): File =
        File(root)
            .resolve(sanitize(ref.provider))
            .resolve(sanitize(ref.manga))
            .resolve(sanitize(ref.chapter))
            .resolve(sanitize(ref.fileName))

    /** `page_007.jpg` — zero-padded index, extension sniffed from the URL. */
    fun pageFileName(oneBasedIndex: Int, url: String): String {
        val ext = url.substringBefore('?').substringAfterLast('.', "")
            .lowercase()
            .takeIf { it.length in 1..5 && it.all(Char::isLetterOrDigit) }
            ?: "jpg"
        return "page_%03d.%s".format(oneBasedIndex, ext)
    }

    /** Strip characters that are illegal in file names across platforms. */
    fun sanitize(raw: String): String {
        val cleaned = raw.trim().map { ch ->
            if (ch.isLetterOrDigit() || ch in "._- ") ch else '_'
        }.joinToString("").trim(' ', '.')
        return cleaned.ifBlank { "_" }.take(120)
    }
}
