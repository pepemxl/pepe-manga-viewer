package read.pepe.manga.ui.reader

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import read.pepe.manga.data.MangaRepository
import read.pepe.manga.data.local.LocalImageStore
import read.pepe.manga.data.local.PageRef
import read.pepe.manga.data.remote.NeighborsDto
import read.pepe.manga.data.remote.ReaderChapterDto
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.reader.ReadDirection
import read.pepe.manga.reader.ReadFit
import read.pepe.manga.reader.ReadMode
import read.pepe.manga.ui.common.Loadable
import read.pepe.manga.ui.common.toMessage

/** Resolved chapter + per-page refs (local-first) + chapter neighbors. */
data class ReaderData(
    val chapter: ReaderChapterDto,
    val pages: List<PageRef>,
    val neighbors: NeighborsDto?,
)

/** Mode / direction / fit — initialised from series config then user-overridable. */
data class ReaderView(
    val mode: ReadMode,
    val direction: ReadDirection,
    val fit: ReadFit,
)

class ReaderViewModel(
    private val repo: MangaRepository = ServiceLocator.repository,
    private val settings: read.pepe.manga.data.settings.SettingsStore = ServiceLocator.settingsStore,
) : ViewModel() {

    private val _data = MutableStateFlow<Loadable<ReaderData>>(Loadable.Loading)
    val data: StateFlow<Loadable<ReaderData>> = _data.asStateFlow()

    private val _view = MutableStateFlow(ReaderView(ReadMode.SINGLE, ReadDirection.RTL, ReadFit.HEIGHT))
    val view: StateFlow<ReaderView> = _view.asStateFlow()

    private val _page = MutableStateFlow(1)
    val page: StateFlow<Int> = _page.asStateFlow()

    private var progressJob: Job? = null
    private var viewInitialised = false

    fun load(chapterId: Int, startPage: Int) {
        _data.value = Loadable.Loading
        viewModelScope.launch {
            runCatching {
                val ch = repo.readerChapter(chapterId)
                // Series title gives the <manga_name> folder; fall back to its id.
                val mangaName = runCatching { repo.series(ch.seriesId).title }.getOrNull()
                    ?.takeIf { it.isNotBlank() } ?: "series_${ch.seriesId}"
                val pages = ch.pageUrls.mapIndexed { i, p ->
                    val url = repo.absoluteUrl(p)
                    PageRef(
                        url = url,
                        provider = LocalImageStore.PROVIDER,
                        manga = mangaName,
                        chapter = ch.number,
                        fileName = LocalImageStore.pageFileName(i + 1, url),
                    )
                }
                val neighbors = runCatching { repo.neighbors(ch.seriesId, ch.id) }.getOrNull()
                ReaderData(ch, pages, neighbors)
            }.onSuccess { d ->
                _data.value = Loadable.Success(d)
                _page.value = startPage.coerceIn(1, d.chapter.pageCount.coerceAtLeast(1))
                if (!viewInitialised) {
                    initView(d.chapter)
                    viewInitialised = true
                }
            }.onFailure { _data.value = Loadable.Error(it.toMessage()) }
        }
    }

    private suspend fun initView(ch: ReaderChapterDto) {
        val defaults = settings.current()
        _view.value = ReaderView(
            mode = ch.readingMode?.let { ReadMode.fromKey(it) } ?: defaults.defaultMode,
            direction = ReadDirection.fromKey(ch.direction.lowercase()).takeIf { ch.direction.isNotBlank() }
                ?: defaults.defaultDirection,
            fit = ch.fit?.let { ReadFit.fromKey(it) } ?: defaults.defaultFit,
        )
    }

    fun setMode(mode: ReadMode) = _view.update { it.copy(mode = mode) }
    fun setDirection(dir: ReadDirection) = _view.update { it.copy(direction = dir) }
    fun setFit(fit: ReadFit) = _view.update { it.copy(fit = fit) }

    val totalPages: Int get() = (data.value as? Loadable.Success)?.data?.chapter?.pageCount ?: 1
    private val chapterId: Int? get() = (data.value as? Loadable.Success)?.data?.chapter?.id

    fun goToPage(p: Int) {
        val total = totalPages
        val clamped = p.coerceIn(1, total)
        if (clamped == _page.value) return
        _page.value = clamped
        reportProgress(clamped, finished = clamped >= total)
    }

    fun next() {
        val step = if (view.value.mode == ReadMode.DOUBLE) 2 else 1
        goToPage(_page.value + step)
    }

    fun prev() {
        val step = if (view.value.mode == ReadMode.DOUBLE) 2 else 1
        goToPage(_page.value - step)
    }

    fun atStart(): Boolean = _page.value <= 1
    fun atEnd(): Boolean = _page.value >= totalPages

    private fun reportProgress(page: Int, finished: Boolean) {
        val id = chapterId ?: return
        progressJob?.cancel()
        progressJob = viewModelScope.launch {
            delay(450) // debounce rapid paging
            runCatching { repo.reportProgress(id, page, finished) }
        }
    }
}
