package read.pepe.manga.data.local

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File

/**
 * Tiny on-disk JSON cache for backend metadata responses (library, series,
 * chapter, …). It's what lets the app browse and read offline: the repository
 * writes through every successful response here and falls back to it when the
 * backend is unreachable.
 *
 * Files live under `<localStorageDir>/_meta/<key>.json`, next to the cached page
 * images. All operations are best-effort — they never throw, so a missing or
 * corrupt cache simply behaves like a miss.
 */
class MetadataCache(val json: Json) {

    fun fileFor(dir: File, key: String): File = File(dir, "$key.json")

    inline fun <reified T> read(dir: File, key: String): T? = runCatching {
        val f = fileFor(dir, key)
        if (!f.exists() || f.length() == 0L) null
        else json.decodeFromString<T>(f.readText())
    }.getOrNull()

    /** Write atomically via a `.part` sibling so a crash never leaves a half file. */
    inline fun <reified T> write(dir: File, key: String, value: T) {
        runCatching {
            dir.mkdirs()
            val target = fileFor(dir, key)
            val tmp = File(dir, target.name + ".part")
            tmp.writeText(json.encodeToString(value))
            if (!tmp.renameTo(target)) {
                tmp.copyTo(target, overwrite = true)
                tmp.delete()
            }
        }
    }
}
