package read.pepe.manga.data.remote

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class LibraryResponse(
    val items: List<SeriesSummaryDto> = emptyList(),
    val count: Int = 0,
)

@Serializable
data class SeriesSummaryDto(
    val id: Int,
    val title: String,
    val author: String? = null,
    val description: String? = null,
    val kind: String = "manga",
    val direction: String = "LTR",
    val language: String? = null,
    @SerialName("source_path") val sourcePath: String? = null,
    val format: String? = null,
    val tags: String? = null,
    val shelf: String = "reading",
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("chapter_count") val chapterCount: Int = 0,
    @SerialName("unread_count") val unreadCount: Int = 0,
    @SerialName("progress_pct") val progressPct: Int = 0,
    @SerialName("last_read_at") val lastReadAt: String? = null,
    @SerialName("added_at") val addedAt: String? = null,
)

@Serializable
data class SeriesDetailDto(
    val id: Int,
    val title: String,
    val author: String? = null,
    val description: String? = null,
    val kind: String = "manga",
    val direction: String = "LTR",
    val language: String? = null,
    val format: String? = null,
    val tags: String? = null,
    val shelf: String = "reading",
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("chapter_count") val chapterCount: Int = 0,
    @SerialName("unread_count") val unreadCount: Int = 0,
    @SerialName("progress_pct") val progressPct: Int = 0,
    val chapters: List<ChapterDto> = emptyList(),
    val bookmarks: List<BookmarkDto> = emptyList(),
    val collections: List<CollectionRefDto> = emptyList(),
)

@Serializable
data class ChapterDto(
    val id: Int,
    @SerialName("series_id") val seriesId: Int,
    val number: String,
    @SerialName("number_sort") val numberSort: Double = 0.0,
    val title: String? = null,
    @SerialName("page_count") val pageCount: Int = 0,
    val format: String? = null,
    @SerialName("progress_page") val progressPage: Int = 0,
    val finished: Boolean = false,
    @SerialName("read_at") val readAt: String? = null,
)

@Serializable
data class BookmarkDto(
    val id: Int,
    @SerialName("series_id") val seriesId: Int,
    @SerialName("chapter_id") val chapterId: Int,
    val page: Int,
    val note: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class CollectionRefDto(val id: Int, val name: String)

@Serializable
data class ReaderChapterDto(
    val id: Int,
    @SerialName("series_id") val seriesId: Int,
    val number: String,
    val title: String? = null,
    @SerialName("page_count") val pageCount: Int,
    @SerialName("page_urls") val pageUrls: List<String> = emptyList(),
    @SerialName("current_page") val currentPage: Int = 1,
    val direction: String = "LTR",
    val kind: String = "manga",
    @SerialName("reading_mode") val readingMode: String? = null,
    val fit: String? = null,
    val zoom: Double? = null,
)

@Serializable
data class NeighborsDto(
    val prev: Int? = null,
    val next: Int? = null,
    val index: Int = 0,
    val total: Int = 0,
)

@Serializable
data class ProgressIn(
    @SerialName("chapter_id") val chapterId: Int,
    val page: Int,
    val finished: Boolean? = null,
)

@Serializable
data class ShelfDto(val id: Int, val name: String, val kind: String, val count: Int = 0)

@Serializable
data class ShelvesResponse(val items: List<ShelfDto> = emptyList())

@Serializable
data class LanguageDto(val name: String, val count: Int = 0)

@Serializable
data class LanguagesResponse(val items: List<LanguageDto> = emptyList())

@Serializable
data class DashboardStatsDto(
    @SerialName("pages_month") val pagesMonth: Int = 0,
    @SerialName("chapters_month") val chaptersMonth: Int = 0,
    @SerialName("streak_days") val streakDays: Int = 0,
    @SerialName("longest_streak") val longestStreak: Int = 0,
    @SerialName("minutes_month") val minutesMonth: Int = 0,
    @SerialName("pages_per_day") val pagesPerDay: List<Int> = emptyList(),
    @SerialName("by_type") val byType: List<ByTypeDto> = emptyList(),
    @SerialName("recent_finishes") val recentFinishes: List<RecentFinishDto> = emptyList(),
)

@Serializable
data class ByTypeDto(val label: String = "", val pct: Int = 0)

@Serializable
data class RecentFinishDto(
    @SerialName("series_id") val seriesId: Int,
    val title: String,
    val chapter: String,
    val at: String? = null,
)

@Serializable
data class InProgressResponse(val items: List<InProgressItemDto> = emptyList())

@Serializable
data class InProgressItemDto(
    @SerialName("series_id") val seriesId: Int,
    val title: String,
    val kind: String = "manga",
    @SerialName("chapter_id") val chapterId: Int,
    val chapter: String,
    val page: Int = 0,
    @SerialName("page_count") val pageCount: Int = 0,
    @SerialName("progress_pct") val progressPct: Int = 0,
    @SerialName("last_read_at") val lastReadAt: String? = null,
)
