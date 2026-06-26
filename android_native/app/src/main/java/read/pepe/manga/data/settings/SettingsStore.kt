package read.pepe.manga.data.settings

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import read.pepe.manga.BuildConfig
import read.pepe.manga.reader.ReadDirection
import read.pepe.manga.reader.ReadFit
import read.pepe.manga.reader.ReadMode
import read.pepe.manga.ui.theme.AppTheme
import read.pepe.manga.ui.theme.ImageRendering

/** Reader/appearance preferences, mirroring the design's TWEAK_DEFAULTS. */
data class AppSettings(
    val baseUrl: String,
    val theme: AppTheme,
    /** User override for page/cover rendering; `null` follows the active theme. */
    val imageRendering: ImageRendering?,
    /** Root folder for the offline page cache (`<root>/<provider>/<manga>/<chapter>/`). */
    val localStorageDir: String,
    val defaultMode: ReadMode,
    val defaultDirection: ReadDirection,
    val defaultFit: ReadFit,
)

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

/** Stored sentinel for the "follow the theme" image-rendering choice. */
private const val AUTO_RENDERING = "auto"

class SettingsStore(private val context: Context) {

    private object Keys {
        val BASE_URL = stringPreferencesKey("base_url")
        val THEME = stringPreferencesKey("theme")
        val IMAGE_RENDERING = stringPreferencesKey("image_rendering")
        val LOCAL_DIR = stringPreferencesKey("local_storage_dir")
        val MODE = stringPreferencesKey("default_mode")
        val DIR = stringPreferencesKey("default_dir")
        val FIT = stringPreferencesKey("default_fit")
    }

    /** App-scoped default: external files dir (no runtime permission needed). */
    val defaultLocalStorageDir: String =
        (context.getExternalFilesDir(null) ?: context.filesDir)
            .resolve("local_storage").absolutePath

    val settings: Flow<AppSettings> = context.dataStore.data.map { p -> p.toSettings() }

    suspend fun current(): AppSettings = context.dataStore.data.first().toSettings()

    private fun Preferences.toSettings() = AppSettings(
        baseUrl = this[Keys.BASE_URL]?.takeIf { it.isNotBlank() } ?: BuildConfig.DEFAULT_BASE_URL,
        theme = AppTheme.fromKey(this[Keys.THEME]),
        imageRendering = when (val v = this[Keys.IMAGE_RENDERING]) {
            // Default for a fresh install: full color. "auto" is the explicit
            // "follow the theme" choice; any other value is a hard override.
            null -> ImageRendering.FULL_COLOR
            AUTO_RENDERING -> null
            else -> ImageRendering.fromKey(v) ?: ImageRendering.FULL_COLOR
        },
        localStorageDir = this[Keys.LOCAL_DIR]?.takeIf { it.isNotBlank() } ?: defaultLocalStorageDir,
        defaultMode = ReadMode.fromKey(this[Keys.MODE]),
        defaultDirection = ReadDirection.fromKey(this[Keys.DIR]),
        defaultFit = ReadFit.fromKey(this[Keys.FIT]),
    )

    suspend fun setBaseUrl(value: String) = edit(Keys.BASE_URL, value.trim().trimEnd('/'))
    suspend fun setTheme(theme: AppTheme) = edit(Keys.THEME, theme.key)

    /** Pass `null` to follow the theme's default rendering ("Auto"). */
    suspend fun setImageRendering(rendering: ImageRendering?) {
        context.dataStore.edit { it[Keys.IMAGE_RENDERING] = rendering?.key ?: AUTO_RENDERING }
    }

    /** Pass `null`/blank to reset to [defaultLocalStorageDir]. */
    suspend fun setLocalStorageDir(path: String?) {
        context.dataStore.edit { prefs ->
            val clean = path?.trim().orEmpty()
            if (clean.isBlank()) prefs.remove(Keys.LOCAL_DIR) else prefs[Keys.LOCAL_DIR] = clean
        }
    }

    suspend fun setDefaultMode(mode: ReadMode) = edit(Keys.MODE, mode.key)
    suspend fun setDefaultDirection(dir: ReadDirection) = edit(Keys.DIR, dir.key)
    suspend fun setDefaultFit(fit: ReadFit) = edit(Keys.FIT, fit.key)

    private suspend fun edit(key: Preferences.Key<String>, value: String) {
        context.dataStore.edit { it[key] = value }
    }
}
