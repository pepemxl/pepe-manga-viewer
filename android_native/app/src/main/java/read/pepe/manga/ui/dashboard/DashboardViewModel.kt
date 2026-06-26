package read.pepe.manga.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import read.pepe.manga.data.MangaRepository
import read.pepe.manga.data.remote.DashboardStatsDto
import read.pepe.manga.data.remote.InProgressItemDto
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.ui.common.Loadable
import read.pepe.manga.ui.common.toMessage

data class DashboardData(
    val stats: DashboardStatsDto,
    val inProgress: List<InProgressItemDto>,
)

class DashboardViewModel(
    private val repo: MangaRepository = ServiceLocator.repository,
) : ViewModel() {

    private val _state = MutableStateFlow<Loadable<DashboardData>>(Loadable.Loading)
    val state: StateFlow<Loadable<DashboardData>> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = Loadable.Loading
        viewModelScope.launch {
            runCatching { DashboardData(repo.dashboardStats(), repo.inProgress()) }
                .onSuccess { _state.value = Loadable.Success(it) }
                .onFailure { _state.value = Loadable.Error(it.toMessage()) }
        }
    }
}
