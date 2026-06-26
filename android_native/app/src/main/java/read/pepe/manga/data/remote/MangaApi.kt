package read.pepe.manga.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MangaApi {

    @GET("api/library")
    suspend fun library(
        @Query("shelf") shelf: String? = null,
        @Query("kind") kind: String? = null,
        @Query("collection") collection: Int? = null,
        @Query("language") language: String? = null,
        @Query("sort") sort: String = "recent",
    ): LibraryResponse

    @GET("api/library/shelves")
    suspend fun shelves(): ShelvesResponse

    @GET("api/library/languages")
    suspend fun languages(): LanguagesResponse

    @GET("api/series/{id}")
    suspend fun series(@Path("id") id: Int): SeriesDetailDto

    @GET("api/reader/chapter/{id}")
    suspend fun readerChapter(@Path("id") chapterId: Int): ReaderChapterDto

    @GET("api/reader/series/{sid}/neighbors/{cid}")
    suspend fun neighbors(
        @Path("sid") seriesId: Int,
        @Path("cid") chapterId: Int,
    ): NeighborsDto

    @POST("api/chapters/{id}/progress")
    suspend fun reportProgress(
        @Path("id") chapterId: Int,
        @Body body: ProgressIn,
    )

    @GET("api/dashboard/stats")
    suspend fun dashboardStats(): DashboardStatsDto

    @GET("api/dashboard/in-progress")
    suspend fun inProgress(): InProgressResponse
}
