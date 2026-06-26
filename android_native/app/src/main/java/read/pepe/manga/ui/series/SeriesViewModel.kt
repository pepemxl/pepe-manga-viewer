package read.pepe.manga.ui.series

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import read.pepe.manga.data.MangaRepository
import read.pepe.manga.data.remote.SeriesDetailDto
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.ui.common.Loadable
import read.pepe.manga.ui.common.toMessage

class SeriesViewModel(
    private val repo: MangaRepository = ServiceLocator.repository,
) : ViewModel() {

    private val _state = MutableStateFlow<Loadable<SeriesDetailDto>>(Loadable.Loading)
    val state: StateFlow<Loadable<SeriesDetailDto>> = _state.asStateFlow()

    private var loadedId: Int? = null

    fun load(id: Int, force: Boolean = false) {
        if (!force && loadedId == id && _state.value is Loadable.Success) return
        loadedId = id
        _state.value = Loadable.Loading
        viewModelScope.launch {
            runCatching { repo.series(id) }
                .onSuccess { _state.value = Loadable.Success(it) }
                .onFailure { _state.value = Loadable.Error(it.toMessage()) }
        }
    }
}

/** Pick the chapter+page to resume: an in-progress chapter, else the first one. */
fun SeriesDetailDto.resumeTarget(): Pair<Int, Int>? {
    val ascending = chapters.sortedBy { it.numberSort }
    val inProgress = ascending.firstOrNull { it.progressPage in 1 until it.pageCount.coerceAtLeast(2) && !it.finished }
    val firstUnfinished = ascending.firstOrNull { !it.finished }
    val target = inProgress ?: firstUnfinished ?: ascending.firstOrNull() ?: return null
    val page = if (target.progressPage > 0) target.progressPage else 1
    return target.id to page
}
