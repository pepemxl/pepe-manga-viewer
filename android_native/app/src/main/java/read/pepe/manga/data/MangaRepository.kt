package read.pepe.manga.data

import kotlinx.serialization.json.Json
import read.pepe.manga.data.local.MetadataCache
import read.pepe.manga.data.remote.ApiFactory
import read.pepe.manga.data.remote.DashboardStatsDto
import read.pepe.manga.data.remote.InProgressItemDto
import read.pepe.manga.data.remote.LanguageDto
import read.pepe.manga.data.remote.LibraryResponse
import read.pepe.manga.data.remote.MangaApi
import read.pepe.manga.data.remote.NeighborsDto
import read.pepe.manga.data.remote.ProgressIn
import read.pepe.manga.data.remote.ReaderChapterDto
import read.pepe.manga.data.remote.SeriesDetailDto
import read.pepe.manga.data.remote.ShelfDto
import read.pepe.manga.data.settings.SettingsStore
import java.io.File
import java.io.IOException

/**
 * Single point of access to the FastAPI backend. Every call resolves the
 * current base URL from [SettingsStore] first, so changing the server in
 * Settings takes effect immediately without recreating the app graph.
 *
 * Offline support: GETs are network-first with write-through to [MetadataCache]
 * and fall back to the last cached copy when the backend is unreachable (an
 * [IOException]). Progress writes that fail offline are queued and replayed on
 * the next successful network call. Page images are cached separately,
 * local-first, by the Coil layer (see `LocalPageFetcher`).
 */
class MangaRepository(private val settings: SettingsStore) {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
        encodeDefaults = true
    }
    private val meta = MetadataCache(json)

    private suspend fun api(): MangaApi = ApiFactory.get(settings.current().baseUrl)
    private suspend fun metaDir(): File = File(settings.current().localStorageDir, META_DIR)

    /** Network-first with write-through; on connectivity failure serve the cached copy. */
    private suspend inline fun <reified T> cached(key: String, fetch: () -> T): T {
        val dir = metaDir()
        return try {
            val fresh = fetch()
            meta.write(dir, key, fresh)
            fresh
        } catch (e: IOException) {
            meta.read<T>(dir, key) ?: throw e
        }
    }

    suspend fun library(
        shelf: String? = null,
        kind: String? = null,
        language: String? = null,
        sort: String = "recent",
    ): LibraryResponse =
        cached("library_${shelf ?: "all"}_${kind ?: "all"}_${language ?: "all"}_$sort") {
            flushPendingProgress()
            api().library(
                shelf = shelf?.takeIf { it != "all" },
                kind = kind?.takeIf { it != "all" },
                language = language,
                sort = sort,
            )
        }

    suspend fun shelves(): List<ShelfDto> = cached("shelves") { api().shelves().items }

    suspend fun languages(): List<LanguageDto> = cached("languages") { api().languages().items }

    suspend fun series(id: Int): SeriesDetailDto = cached("series_$id") { api().series(id) }

    suspend fun readerChapter(chapterId: Int): ReaderChapterDto =
        cached("chapter_$chapterId") { api().readerChapter(chapterId) }

    suspend fun neighbors(seriesId: Int, chapterId: Int): NeighborsDto =
        cached("neighbors_${seriesId}_$chapterId") { api().neighbors(seriesId, chapterId) }

    suspend fun reportProgress(chapterId: Int, page: Int, finished: Boolean? = null) {
        val entry = ProgressIn(chapterId, page, finished)
        try {
            api().reportProgress(chapterId, entry)
            flushPendingProgress() // opportunistic catch-up while we have a connection
        } catch (e: IOException) {
            queuePendingProgress(entry)
        }
    }

    suspend fun dashboardStats(): DashboardStatsDto =
        cached("dashboard_stats") { flushPendingProgress(); api().dashboardStats() }

    suspend fun inProgress(): List<InProgressItemDto> =
        cached("dashboard_in_progress") { api().inProgress().items }

    /** Absolute URL for a reader page or cover path against the active server. */
    suspend fun absoluteUrl(path: String): String =
        ApiFactory.absoluteUrl(settings.current().baseUrl, path)

    // ── pending progress (offline → replay) ────────────────────────────────

    private suspend fun queuePendingProgress(entry: ProgressIn) {
        val dir = metaDir()
        val pending = meta.read<Map<Int, ProgressIn>>(dir, PENDING_PROGRESS).orEmpty().toMutableMap()
        pending[entry.chapterId] = entry // keep only the latest position per chapter
        meta.write(dir, PENDING_PROGRESS, pending)
    }

    /** Replay queued progress; stops at the first failure so we don't hammer an offline server. */
    private suspend fun flushPendingProgress() {
        val dir = metaDir()
        val pending = meta.read<Map<Int, ProgressIn>>(dir, PENDING_PROGRESS).orEmpty()
        if (pending.isEmpty()) return
        val remaining = pending.toMutableMap()
        for ((id, entry) in pending) {
            try {
                api().reportProgress(id, entry)
                remaining.remove(id)
            } catch (e: IOException) {
                break // still offline — keep the rest for next time
            }
        }
        meta.write(dir, PENDING_PROGRESS, remaining)
    }

    private companion object {
        const val META_DIR = "_meta"
        const val PENDING_PROGRESS = "pending_progress"
    }
}
