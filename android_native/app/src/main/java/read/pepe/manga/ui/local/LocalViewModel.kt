package read.pepe.manga.ui.local

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import read.pepe.manga.data.local.LocalLibrary
import read.pepe.manga.data.local.LocalSeries
import read.pepe.manga.di.ServiceLocator

class LocalViewModel(
    private val lib: LocalLibrary = ServiceLocator.localLibrary,
) : ViewModel() {

    private val _series = MutableStateFlow<List<LocalSeries>>(emptyList())
    val series: StateFlow<List<LocalSeries>> = _series.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    init { refresh() }

    fun refresh() = viewModelScope.launch { _series.value = lib.list() }

    fun import(context: Context, uri: Uri) = viewModelScope.launch {
        _busy.value = true
        _message.value = null
        runCatching { lib.importTree(context, uri) }
            .onSuccess { s ->
                val extra = if (s.skipped.isNotEmpty()) " (${s.skipped.size} unsupported skipped)" else ""
                _message.value = "Imported “${s.title}” — ${s.chapters.size} chapter(s)$extra"
                _series.value = lib.list()
            }
            .onFailure { _message.value = it.message ?: "Import failed" }
        _busy.value = false
    }

    fun remove(id: String) = viewModelScope.launch {
        lib.remove(id)
        _series.value = lib.list()
    }
}
