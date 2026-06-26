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

/** Reader/appearance preferences, mirroring the design's TWEAK_DEFAULTS. */
data class AppSettings(
    val baseUrl: String,
    val theme: AppTheme,
    val defaultMode: ReadMode,
    val defaultDirection: ReadDirection,
    val defaultFit: ReadFit,
)

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class SettingsStore(private val context: Context) {

    private object Keys {
        val BASE_URL = stringPreferencesKey("base_url")
        val THEME = stringPreferencesKey("theme")
        val MODE = stringPreferencesKey("default_mode")
        val DIR = stringPreferencesKey("default_dir")
        val FIT = stringPreferencesKey("default_fit")
    }

    val settings: Flow<AppSettings> = context.dataStore.data.map { p -> p.toSettings() }

    suspend fun current(): AppSettings = context.dataStore.data.first().toSettings()

    private fun Preferences.toSettings() = AppSettings(
        baseUrl = this[Keys.BASE_URL]?.takeIf { it.isNotBlank() } ?: BuildConfig.DEFAULT_BASE_URL,
        theme = AppTheme.fromKey(this[Keys.THEME]),
        defaultMode = ReadMode.fromKey(this[Keys.MODE]),
        defaultDirection = ReadDirection.fromKey(this[Keys.DIR]),
        defaultFit = ReadFit.fromKey(this[Keys.FIT]),
    )

    suspend fun setBaseUrl(value: String) = edit(Keys.BASE_URL, value.trim().trimEnd('/'))
    suspend fun setTheme(theme: AppTheme) = edit(Keys.THEME, theme.key)
    suspend fun setDefaultMode(mode: ReadMode) = edit(Keys.MODE, mode.key)
    suspend fun setDefaultDirection(dir: ReadDirection) = edit(Keys.DIR, dir.key)
    suspend fun setDefaultFit(fit: ReadFit) = edit(Keys.FIT, fit.key)

    private suspend fun edit(key: Preferences.Key<String>, value: String) {
        context.dataStore.edit { it[key] = value }
    }
}
