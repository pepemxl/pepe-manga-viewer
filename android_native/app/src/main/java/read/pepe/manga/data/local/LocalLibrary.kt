package read.pepe.manga.data.local

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import androidx.documentfile.provider.DocumentFile
import com.github.junrar.Archive
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import read.pepe.manga.data.settings.SettingsStore
import java.io.File
import java.util.zip.ZipFile

@Serializable
data class LocalChapter(
    val id: String,
    val title: String,
    val number: String,
    /** Page file names within `<root>/_local/<seriesId>/<id>/`, in reading order. */
    val pages: List<String> = emptyList(),
)

@Serializable
data class LocalSeries(
    val id: String,
    val title: String,
    val chapters: List<LocalChapter> = emptyList(),
    /** Sources skipped during import (e.g. .cbr / .pdf — not supported yet). */
    val skipped: List<String> = emptyList(),
)

/**
 * Local-only library: series imported from device files, extracted into
 * `<localStorageDir>/_local/<seriesId>/<chapterId>/page_XXXX.ext` so they reuse
 * the same on-disk layout (and Coil [LocalPageFetcher]) as cached online pages —
 * `PageRef(provider = LOCAL_PROVIDER, manga = seriesId, chapter = chapterId)`
 * resolves straight to a file that already exists, so nothing is ever downloaded.
 *
 * The index (titles + page file names) is a JSON file under `_local/index.json`.
 */
class LocalLibrary(private val settings: SettingsStore) {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; prettyPrint = false }

    private suspend fun rootDir(): File = File(settings.current().localStorageDir, LocalImageStore.LOCAL_PROVIDER)
    private suspend fun indexFile(): File = File(rootDir(), "index.json")

    suspend fun list(): List<LocalSeries> = withContext(Dispatchers.IO) {
        runCatching {
            val f = indexFile()
            if (!f.exists() || f.length() == 0L) emptyList()
            else json.decodeFromString<List<LocalSeries>>(f.readText())
        }.getOrDefault(emptyList())
    }

    suspend fun get(id: String): LocalSeries? = list().find { it.id == id }

    private suspend fun save(items: List<LocalSeries>) = withContext(Dispatchers.IO) {
        runCatching {
            val f = indexFile()
            f.parentFile?.mkdirs()
            val tmp = File(f.parentFile, "index.json.part")
            tmp.writeText(json.encodeToString(items))
            if (!tmp.renameTo(f)) { tmp.copyTo(f, overwrite = true); tmp.delete() }
        }
    }

    suspend fun remove(id: String) = withContext(Dispatchers.IO) {
        save(list().filter { it.id != id })
        runCatching { File(rootDir(), LocalImageStore.sanitize(id)).deleteRecursively() }
        Unit
    }

    /**
     * Import a folder picked via SAF as a local series: each `.cbz`/`.zip` and
     * each image sub-folder is a chapter; loose images form one chapter. Returns
     * the imported series (also persisted to the index).
     */
    suspend fun importTree(context: Context, treeUri: Uri): LocalSeries = withContext(Dispatchers.IO) {
        val tree = DocumentFile.fromTreeUri(context, treeUri)
            ?: throw IllegalArgumentException("Couldn't open that folder.")
        val title = tree.name?.takeIf { it.isNotBlank() } ?: "Local"
        val seriesId = "${LocalImageStore.sanitize(title)}-${shortHash(treeUri.toString())}"
        val seriesDir = File(rootDir(), seriesId).apply { mkdirs() }

        val chapters = mutableListOf<LocalChapter>()
        val skipped = mutableListOf<String>()
        val looseImages = mutableListOf<DocumentFile>()

        for (child in tree.listFiles().sortedBy { it.name ?: "" }) {
            val name = child.name ?: continue
            when {
                child.isDirectory -> {
                    val cid = LocalImageStore.sanitize(name)
                    val pages = copyImageDir(context, child, File(seriesDir, cid))
                    if (pages.isNotEmpty()) chapters += LocalChapter(cid, name, name, pages)
                }
                isArchive(name) -> {
                    val stem = name.substringBeforeLast('.')
                    val cid = LocalImageStore.sanitize(stem)
                    val pages = extractZip(context, child.uri, File(seriesDir, cid), context.cacheDir)
                    if (pages.isNotEmpty()) chapters += LocalChapter(cid, stem, stem, pages)
                }
                isPdf(name) -> {
                    val stem = name.substringBeforeLast('.')
                    val cid = LocalImageStore.sanitize(stem)
                    val pages = extractPdf(context, child.uri, File(seriesDir, cid))
                    if (pages.isNotEmpty()) chapters += LocalChapter(cid, stem, stem, pages)
                }
                isRar(name) -> {
                    val stem = name.substringBeforeLast('.')
                    val cid = LocalImageStore.sanitize(stem)
                    val pages = runCatching { extractRar(context, child.uri, File(seriesDir, cid), context.cacheDir) }
                        .getOrElse { emptyList() }
                    if (pages.isNotEmpty()) chapters += LocalChapter(cid, stem, stem, pages) else skipped += name
                }
                isImage(name) -> looseImages += child
            }
        }

        if (looseImages.isNotEmpty()) {
            val pages = copyDocs(context, looseImages, File(seriesDir, "chapter"))
            if (pages.isNotEmpty()) chapters += LocalChapter("chapter", title, "1", pages)
        }

        if (chapters.isEmpty()) {
            throw IllegalStateException(
                if (skipped.isEmpty()) "No readable images found in that folder."
                else "Only unsupported files found (${skipped.joinToString()}). CBR/PDF aren't supported yet."
            )
        }

        val series = LocalSeries(seriesId, title, chapters, skipped)
        save(listOf(series) + list().filter { it.id != seriesId })
        series
    }

    // ── extraction helpers ──────────────────────────────────────────────────

    private fun extractZip(context: Context, uri: Uri, outDir: File, cacheDir: File): List<String> {
        // Copy to a temp file so we can random-access entries (sorted) with ZipFile.
        val tmp = File.createTempFile("import", ".zip", cacheDir)
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                tmp.outputStream().use { input.copyTo(it) }
            } ?: return emptyList()
            ZipFile(tmp).use { zip ->
                val entries = zip.entries().asSequence()
                    .filter { !it.isDirectory && isImage(it.name) }
                    .sortedBy { it.name }
                    .toList()
                if (entries.isEmpty()) return emptyList()
                outDir.mkdirs()
                return entries.mapIndexed { i, e ->
                    val fileName = "page_%04d.%s".format(i + 1, imgExt(e.name))
                    zip.getInputStream(e).use { input ->
                        File(outDir, fileName).outputStream().use { input.copyTo(it) }
                    }
                    fileName
                }
            }
        } finally {
            tmp.delete()
        }
    }

    /** Extract image entries of a .cbr/.rar (via junrar), sorted by name. */
    private fun extractRar(context: Context, uri: Uri, outDir: File, cacheDir: File): List<String> {
        val tmp = File.createTempFile("import", ".rar", cacheDir)
        try {
            context.contentResolver.openInputStream(uri)?.use { input ->
                tmp.outputStream().use { input.copyTo(it) }
            } ?: return emptyList()
            Archive(tmp).use { archive ->
                val headers = archive.fileHeaders
                    .filter { !it.isDirectory && isImage(it.fileName) }
                    .sortedBy { it.fileName }
                if (headers.isEmpty()) return emptyList()
                outDir.mkdirs()
                return headers.mapIndexed { i, h ->
                    val fileName = "page_%04d.%s".format(i + 1, imgExt(h.fileName))
                    File(outDir, fileName).outputStream().use { os -> archive.extractFile(h, os) }
                    fileName
                }
            }
        } finally {
            tmp.delete()
        }
    }

    /** Render a PDF's pages to JPEGs with the platform [PdfRenderer] (no extra deps). */
    private fun extractPdf(context: Context, uri: Uri, outDir: File): List<String> {
        val pfd = context.contentResolver.openFileDescriptor(uri, "r") ?: return emptyList()
        pfd.use {
            PdfRenderer(it).use { renderer ->
                if (renderer.pageCount == 0) return emptyList()
                outDir.mkdirs()
                val names = mutableListOf<String>()
                for (i in 0 until renderer.pageCount) {
                    renderer.openPage(i).use { page ->
                        // ~150 dpi (page dimensions are in 1/72") for legible text.
                        val scale = 2
                        val bmp = Bitmap.createBitmap(page.width * scale, page.height * scale, Bitmap.Config.ARGB_8888)
                        bmp.eraseColor(Color.WHITE) // PDFs assume a white page
                        page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        val fileName = "page_%04d.jpg".format(i + 1)
                        File(outDir, fileName).outputStream().use { os ->
                            bmp.compress(Bitmap.CompressFormat.JPEG, 85, os)
                        }
                        bmp.recycle()
                        names += fileName
                    }
                }
                return names
            }
        }
    }

    private fun copyImageDir(context: Context, dir: DocumentFile, outDir: File): List<String> {
        val images = dir.listFiles().filter { it.isFile && isImage(it.name ?: "") }.sortedBy { it.name ?: "" }
        return copyDocs(context, images, outDir)
    }

    private fun copyDocs(context: Context, docs: List<DocumentFile>, outDir: File): List<String> {
        if (docs.isEmpty()) return emptyList()
        outDir.mkdirs()
        return docs.mapIndexedNotNull { i, doc ->
            val src = doc.name ?: return@mapIndexedNotNull null
            val fileName = "page_%04d.%s".format(i + 1, imgExt(src))
            runCatching {
                context.contentResolver.openInputStream(doc.uri)?.use { input ->
                    File(outDir, fileName).outputStream().use { input.copyTo(it) }
                }
            }.getOrNull()
            fileName
        }
    }

    private companion object {
        fun isImage(name: String): Boolean =
            name.substringAfterLast('.', "").lowercase() in IMAGE_EXTS
        fun isArchive(name: String): Boolean =
            name.substringAfterLast('.', "").lowercase() in setOf("cbz", "zip")
        fun isPdf(name: String): Boolean =
            name.substringAfterLast('.', "").lowercase() == "pdf"
        fun isRar(name: String): Boolean =
            name.substringAfterLast('.', "").lowercase() in setOf("cbr", "rar")

        fun imgExt(name: String): String {
            val ext = name.substringBefore('?').substringAfterLast('.', "").lowercase()
            return ext.takeIf { it.length in 1..5 && it.all(Char::isLetterOrDigit) } ?: "jpg"
        }

        fun shortHash(s: String): String = Integer.toHexString(s.hashCode())

        val IMAGE_EXTS = setOf("jpg", "jpeg", "png", "webp", "gif", "bmp", "avif")
    }
}
