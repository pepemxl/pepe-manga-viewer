package read.pepe.manga.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import read.pepe.manga.data.MangaRepository
import read.pepe.manga.data.remote.SeriesSummaryDto
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.ui.common.Loadable
import read.pepe.manga.ui.common.toMessage

data class LibraryFilters(
    val shelf: String = "all",
    val type: String = "all",
    val query: String = "",
)

val SHELVES = listOf(
    "all" to "All series",
    "reading" to "Currently Reading",
    "want" to "Want to Read",
    "finished" to "Finished",
)
val TYPES = listOf(
    "all" to "All", "manga" to "Manga", "manhwa" to "Manhwa", "book" to "Books", "comic" to "Comics",
)

class LibraryViewModel(
    private val repo: MangaRepository = ServiceLocator.repository,
) : ViewModel() {

    private val _state = MutableStateFlow<Loadable<List<SeriesSummaryDto>>>(Loadable.Loading)
    val state: StateFlow<Loadable<List<SeriesSummaryDto>>> = _state.asStateFlow()

    private val _filters = MutableStateFlow(LibraryFilters())
    val filters: StateFlow<LibraryFilters> = _filters.asStateFlow()

    init { load() }

    fun load() {
        _state.value = Loadable.Loading
        viewModelScope.launch {
            runCatching { repo.library(shelf = _filters.value.shelf, kind = _filters.value.type) }
                .onSuccess { _state.value = Loadable.Success(it.items) }
                .onFailure { _state.value = Loadable.Error(it.toMessage()) }
        }
    }

    fun setShelf(shelf: String) { _filters.update { it.copy(shelf = shelf) }; load() }
    fun setType(type: String) { _filters.update { it.copy(type = type) }; load() }
    fun setQuery(q: String) { _filters.update { it.copy(query = q) } }

    /** Client-side title/author filter, like the design's Library search. */
    fun visible(items: List<SeriesSummaryDto>): List<SeriesSummaryDto> {
        val q = _filters.value.query.trim().lowercase()
        if (q.isEmpty()) return items
        return items.filter {
            it.title.lowercase().contains(q) || (it.author?.lowercase()?.contains(q) == true)
        }
    }
}
