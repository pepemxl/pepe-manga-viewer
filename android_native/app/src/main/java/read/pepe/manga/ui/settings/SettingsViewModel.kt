package read.pepe.manga.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import read.pepe.manga.data.settings.AppSettings
import read.pepe.manga.data.settings.SettingsStore
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.reader.ReadDirection
import read.pepe.manga.reader.ReadFit
import read.pepe.manga.reader.ReadMode
import read.pepe.manga.ui.theme.AppTheme

class SettingsViewModel(
    private val store: SettingsStore = ServiceLocator.settingsStore,
) : ViewModel() {

    val settings: StateFlow<AppSettings?> = store.settings
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    fun setTheme(theme: AppTheme) = viewModelScope.launch { store.setTheme(theme) }
    fun setBaseUrl(url: String) = viewModelScope.launch { store.setBaseUrl(url) }
    fun setMode(mode: ReadMode) = viewModelScope.launch { store.setDefaultMode(mode) }
    fun setDirection(dir: ReadDirection) = viewModelScope.launch { store.setDefaultDirection(dir) }
    fun setFit(fit: ReadFit) = viewModelScope.launch { store.setDefaultFit(fit) }
}
