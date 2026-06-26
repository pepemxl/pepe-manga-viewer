package read.pepe.manga.di

import android.content.Context
import read.pepe.manga.data.MangaRepository
import read.pepe.manga.data.settings.SettingsStore

/** Lightweight manual DI — no annotation processor, single source of truth. */
object ServiceLocator {

    @Volatile private var initialized = false

    lateinit var settingsStore: SettingsStore
        private set
    lateinit var repository: MangaRepository
        private set

    fun init(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            settingsStore = SettingsStore(context.applicationContext)
            repository = MangaRepository(settingsStore)
            initialized = true
        }
    }
}
