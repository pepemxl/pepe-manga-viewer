package read.pepe.manga.data

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

/**
 * Single point of access to the FastAPI backend. Every call resolves the
 * current base URL from [SettingsStore] first, so changing the server in
 * Settings takes effect immediately without recreating the app graph.
 */
class MangaRepository(private val settings: SettingsStore) {

    private suspend fun api(): MangaApi = ApiFactory.get(settings.current().baseUrl)

    suspend fun library(
        shelf: String? = null,
        kind: String? = null,
        language: String? = null,
        sort: String = "recent",
    ): LibraryResponse = api().library(
        shelf = shelf?.takeIf { it != "all" },
        kind = kind?.takeIf { it != "all" },
        language = language,
        sort = sort,
    )

    suspend fun shelves(): List<ShelfDto> = api().shelves().items

    suspend fun languages(): List<LanguageDto> = api().languages().items

    suspend fun series(id: Int): SeriesDetailDto = api().series(id)

    suspend fun readerChapter(chapterId: Int): ReaderChapterDto = api().readerChapter(chapterId)

    suspend fun neighbors(seriesId: Int, chapterId: Int): NeighborsDto =
        api().neighbors(seriesId, chapterId)

    suspend fun reportProgress(chapterId: Int, page: Int, finished: Boolean? = null) {
        api().reportProgress(chapterId, ProgressIn(chapterId, page, finished))
    }

    suspend fun dashboardStats(): DashboardStatsDto = api().dashboardStats()

    suspend fun inProgress(): List<InProgressItemDto> = api().inProgress().items

    /** Absolute URL for a reader page or cover path against the active server. */
    suspend fun absoluteUrl(path: String): String =
        ApiFactory.absoluteUrl(settings.current().baseUrl, path)
}
