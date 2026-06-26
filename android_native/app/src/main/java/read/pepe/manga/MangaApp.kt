package read.pepe.manga

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.disk.DiskCache
import coil3.disk.directory
import coil3.memory.MemoryCache
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import coil3.request.crossfade
import read.pepe.manga.data.remote.ApiFactory
import read.pepe.manga.di.ServiceLocator

class MangaApp : Application(), SingletonImageLoader.Factory {

    override fun onCreate() {
        super.onCreate()
        ServiceLocator.init(this)
    }

    /** Coil shares the app's OkHttp client and caches pages aggressively. */
    override fun newImageLoader(context: PlatformContext): ImageLoader =
        ImageLoader.Builder(context)
            .components {
                add(OkHttpNetworkFetcherFactory(callFactory = { ApiFactory.okHttp }))
            }
            .memoryCache {
                MemoryCache.Builder()
                    .maxSizePercent(context, 0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(256L * 1024 * 1024)
                    .build()
            }
            .crossfade(false) // e-ink: no fade transitions
            .build()
}
