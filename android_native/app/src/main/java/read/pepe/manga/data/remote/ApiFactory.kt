package read.pepe.manga.data.remote

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit

/**
 * Builds (and memoizes) a [MangaApi] per base URL. The base URL is user-editable
 * at runtime, so the factory rebuilds Retrofit only when the host actually changes.
 * The shared [okHttp] client is reused by Coil so image + JSON traffic share a pool.
 */
object ApiFactory {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    val okHttp: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        )
        .build()

    @Volatile
    private var cached: Pair<String, MangaApi>? = null

    @Synchronized
    fun get(baseUrl: String): MangaApi {
        val normalized = normalize(baseUrl)
        cached?.let { (url, api) -> if (url == normalized) return api }
        val api = Retrofit.Builder()
            .baseUrl(normalized)
            .client(okHttp)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(MangaApi::class.java)
        cached = normalized to api
        return api
    }

    /** Resolve a cover/page path returned by the API into an absolute URL. */
    fun absoluteUrl(baseUrl: String, path: String): String = when {
        path.startsWith("http://") || path.startsWith("https://") -> path
        else -> normalize(baseUrl).trimEnd('/') + "/" + path.trimStart('/')
    }

    private fun normalize(baseUrl: String): String {
        val trimmed = baseUrl.trim().ifBlank { "http://10.0.2.2:8202" }
        return if (trimmed.endsWith("/")) trimmed else "$trimmed/"
    }
}
