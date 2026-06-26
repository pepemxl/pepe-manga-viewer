package read.pepe.manga.data.local

import coil3.ImageLoader
import coil3.decode.DataSource
import coil3.decode.ImageSource
import coil3.fetch.FetchResult
import coil3.fetch.Fetcher
import coil3.fetch.SourceFetchResult
import coil3.key.Keyer
import coil3.request.Options
import okhttp3.OkHttpClient
import okhttp3.Request
import okio.FileSystem
import okio.Path.Companion.toOkioPath
import read.pepe.manga.data.settings.SettingsStore
import java.io.File
import java.io.IOException

/**
 * Coil fetcher for [PageRef] models that implements the offline cache:
 *  1. If the page already exists under the local_storage root, serve it from disk.
 *  2. Otherwise download it from the API, write it through to disk, then serve it.
 *
 * Plain URL (cover) models are untouched — they keep using Coil's network fetcher.
 */
class LocalPageFetcher(
    private val ref: PageRef,
    private val settings: SettingsStore,
    private val callFactory: OkHttpClient,
) : Fetcher {

    override suspend fun fetch(): FetchResult {
        val root = settings.current().localStorageDir
        val file = LocalImageStore.fileFor(root, ref)
        if (!file.exists() || file.length() == 0L) {
            download(file)
        }
        return SourceFetchResult(
            source = ImageSource(file = file.toOkioPath(), fileSystem = FileSystem.SYSTEM),
            mimeType = null,
            dataSource = DataSource.DISK,
        )
    }

    /** Download to a `.part` sibling then atomically rename, so partial files never serve. */
    private fun download(target: File) {
        target.parentFile?.mkdirs()
        val request = Request.Builder().url(ref.url).build()
        callFactory.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) throw IOException("HTTP ${resp.code} fetching ${ref.url}")
            val body = resp.body ?: throw IOException("Empty body for ${ref.url}")
            val tmp = File(target.parentFile, target.name + ".part")
            body.byteStream().use { input -> tmp.outputStream().use { input.copyTo(it) } }
            if (!tmp.renameTo(target)) {
                tmp.copyTo(target, overwrite = true)
                tmp.delete()
            }
        }
    }

    class Factory(
        private val settings: SettingsStore,
        private val callFactory: () -> OkHttpClient,
    ) : Fetcher.Factory<PageRef> {
        override fun create(data: PageRef, options: Options, imageLoader: ImageLoader): Fetcher =
            LocalPageFetcher(data, settings, callFactory())
    }
}

/** Memory-cache key for [PageRef] — keyed on the source URL so it survives root changes. */
class PageRefKeyer : Keyer<PageRef> {
    override fun key(data: PageRef, options: Options): String = data.url
}
