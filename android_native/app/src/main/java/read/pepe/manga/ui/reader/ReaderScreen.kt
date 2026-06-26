package read.pepe.manga.ui.reader

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.NavigateBefore
import androidx.compose.material.icons.automirrored.filled.NavigateNext
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.launch
import read.pepe.manga.reader.ReadDirection
import read.pepe.manga.reader.ReadFit
import read.pepe.manga.reader.ReadMode
import read.pepe.manga.ui.common.StateHost
import read.pepe.manga.ui.components.EInkAsyncImage
import read.pepe.manga.ui.components.IconBox
import read.pepe.manga.ui.components.MonoText
import read.pepe.manga.ui.components.SectionLabel
import read.pepe.manga.ui.components.SegOption
import read.pepe.manga.ui.components.Segmented
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun ReaderScreen(
    chapterId: Int,
    startPage: Int,
    onExit: () -> Unit,
    vm: ReaderViewModel = viewModel(),
) {
    LaunchedEffect(chapterId) { vm.load(chapterId, startPage) }
    val state by vm.data.collectAsStateWithLifecycle()
    val c = AppTheming.colors

    Box(Modifier.fillMaxSize().background(c.bgElevated)) {
        StateHost(state = state, onRetry = { vm.load(chapterId, startPage) }, modifier = Modifier.fillMaxSize()) { data ->
            ReaderContent(data = data, vm = vm, onExit = onExit, onChangeChapter = { vm.load(it, 1) })
        }
    }
}

@Composable
private fun ReaderContent(
    data: ReaderData,
    vm: ReaderViewModel,
    onExit: () -> Unit,
    onChangeChapter: (Int) -> Unit,
) {
    val c = AppTheming.colors
    val view by vm.view.collectAsStateWithLifecycle()
    val page by vm.page.collectAsStateWithLifecycle()

    var chromeShown by remember { mutableStateOf(true) }
    var settingsOpen by remember { mutableStateOf(false) }
    var pokeTick by remember { mutableIntStateOf(0) }
    fun poke() { chromeShown = true; pokeTick++ }

    // chrome auto-hide (skipped in e-ink themes — no point animating, but still hides)
    LaunchedEffect(pokeTick, settingsOpen) {
        if (settingsOpen) return@LaunchedEffect
        kotlinx.coroutines.delay(2800)
        chromeShown = false
    }

    Box(Modifier.fillMaxSize()) {
        // page stage
        when (view.mode) {
            ReadMode.SINGLE, ReadMode.DOUBLE -> PagedStage(data, view, page)
            ReadMode.VERTICAL -> ContinuousStage(data, vertical = true, page = page, onPage = { vm.goToPage(it) }, onTap = ::poke)
            ReadMode.HORIZONTAL -> ContinuousStage(data, vertical = false, page = page, onPage = { vm.goToPage(it) }, onTap = ::poke)
        }

        // tap zones for paged modes
        if (!view.mode.isContinuous) {
            val rtl = view.direction.isRtl
            Row(Modifier.fillMaxSize()) {
                TapZone(Modifier.weight(0.34f)) { if (rtl) vm.next() else vm.prev(); poke() }
                TapZone(Modifier.weight(0.32f)) { chromeShown = !chromeShown }
                TapZone(Modifier.weight(0.34f)) { if (rtl) vm.prev() else vm.next(); poke() }
            }
        }

        if (chromeShown) {
            TopChrome(
                title = data.chapter.title ?: "Chapter ${data.chapter.number}",
                subtitle = "Ch. ${data.chapter.number}",
                indicator = if (view.mode.isContinuous)
                    "${(page * 100 / data.chapter.pageCount.coerceAtLeast(1))}%"
                else "$page / ${data.chapter.pageCount}",
                settingsActive = settingsOpen,
                onBack = onExit,
                onToggleSettings = { settingsOpen = !settingsOpen; poke() },
                modifier = Modifier.align(Alignment.TopCenter),
            )

            BottomChrome(
                page = page,
                total = data.chapter.pageCount,
                hasPrev = data.neighbors?.prev != null,
                hasNext = data.neighbors?.next != null,
                onPrevChapter = { data.neighbors?.prev?.let(onChangeChapter) },
                onNextChapter = { data.neighbors?.next?.let(onChangeChapter) },
                onScrub = { vm.goToPage(it) },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }

        if (settingsOpen && chromeShown) {
            ReaderSettingsPanel(
                view = view,
                onMode = vm::setMode,
                onDir = vm::setDirection,
                onFit = vm::setFit,
                modifier = Modifier.align(Alignment.TopEnd).padding(top = 64.dp, end = 12.dp),
            )
        }
    }
}

@Composable
private fun TapZone(modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.fillMaxHeight().clickable(
        interactionSource = remember { MutableInteractionSource() },
        indication = null,
        onClick = onClick,
    ))
}

/* ---------------- paged (single / double) ---------------- */

@Composable
private fun PagedStage(data: ReaderData, view: ReaderView, page: Int) {
    val contentScale = when (view.fit) {
        ReadFit.HEIGHT -> ContentScale.Fit
        ReadFit.WIDTH -> ContentScale.FillWidth
        ReadFit.ORIGINAL -> ContentScale.Inside
    }
    Box(Modifier.fillMaxSize().padding(8.dp), contentAlignment = Alignment.Center) {
        if (view.mode == ReadMode.SINGLE) {
            PageImage(data.pageUrls.getOrNull(page - 1), contentScale, Modifier.fillMaxSize())
        } else {
            // double spread: page 1 alone, else pairs; ordering flips for RTL
            val (leftIdx, rightIdx) = spreadIndices(page, data.chapter.pageCount, view.direction)
            Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                PageSlot(data.pageUrls.getOrNull(leftIdx), contentScale, Modifier.weight(1f).fillMaxHeight())
                PageSlot(data.pageUrls.getOrNull(rightIdx), contentScale, Modifier.weight(1f).fillMaxHeight())
            }
        }
    }
}

/**
 * Left/right slot page indices (0-based, -1 = blank) for the double-spread,
 * ported from reader.jsx: page 1 sits alone, then consecutive pairs, with
 * left/right order flipped for RTL.
 */
private fun spreadIndices(page: Int, total: Int, dir: ReadDirection): Pair<Int, Int> {
    if (page <= 1) return -1 to 0 // blank | page 1
    val base = if (page % 2 == 0) page else page - 1 // 1-based first of the pair
    val a = base - 1
    val b = if (base + 1 <= total) base else -1 // 0-based second page (= base, since base+1 1-based → index base)
    return if (dir.isRtl) b to a else a to b
}

@Composable
private fun PageSlot(url: String?, contentScale: ContentScale, modifier: Modifier) {
    if (url == null) Box(modifier) else PageImage(url, contentScale, modifier)
}

@Composable
private fun PageImage(url: String?, contentScale: ContentScale, modifier: Modifier) {
    if (url == null) {
        Box(modifier)
        return
    }
    EInkAsyncImage(model = url, contentDescription = null, modifier = modifier, contentScale = contentScale)
}

/* ---------------- continuous (webtoon / strip) ---------------- */

@Composable
private fun ContinuousStage(
    data: ReaderData,
    vertical: Boolean,
    page: Int,
    onPage: (Int) -> Unit,
    onTap: () -> Unit,
) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()

    // report page from scroll position
    val firstVisible by remember { derivedStateOf { listState.firstVisibleItemIndex } }
    LaunchedEffect(Unit) {
        snapshotFlow { firstVisible }.collect { idx -> onPage(idx + 1) }
    }
    // scrubber-driven scroll
    LaunchedEffect(page) {
        if (page - 1 != listState.firstVisibleItemIndex) {
            scope.launch { listState.scrollToItem((page - 1).coerceAtLeast(0)) }
        }
    }

    val tap = Modifier.pointerInput(Unit) { detectTapGestures(onTap = { onTap() }) }
    if (vertical) {
        LazyColumn(state = listState, modifier = Modifier.fillMaxSize().then(tap)) {
            items(items = data.pageUrls) { url ->
                EInkAsyncImage(
                    model = url,
                    contentDescription = null,
                    modifier = Modifier.fillMaxWidth(),
                    contentScale = ContentScale.FillWidth,
                )
            }
        }
    } else {
        LazyRow(state = listState, modifier = Modifier.fillMaxSize().then(tap)) {
            items(items = data.pageUrls) { url ->
                EInkAsyncImage(
                    model = url,
                    contentDescription = null,
                    modifier = Modifier.fillMaxHeight().aspectRatio(2f / 3f),
                    contentScale = ContentScale.FillHeight,
                )
            }
        }
    }
}

/* ---------------- chrome ---------------- */

@Composable
private fun TopChrome(
    title: String,
    subtitle: String,
    indicator: String,
    settingsActive: Boolean,
    onBack: () -> Unit,
    onToggleSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .fillMaxWidth()
            .background(c.scrim)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        IconBox(Icons.AutoMirrored.Filled.ArrowBack, "Back to library", onClick = onBack)
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = c.ink, maxLines = 1)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = c.ink3, maxLines = 1)
        }
        Box(
            Modifier
                .clip(RoundedCornerShape(7.dp))
                .background(c.panel)
                .border(1.dp, c.line, RoundedCornerShape(7.dp))
                .padding(horizontal = 10.dp, vertical = 6.dp),
        ) { MonoText(indicator, size = 12, color = c.ink2) }
        IconBox(Icons.Filled.Settings, "Reading settings", onClick = onToggleSettings, active = settingsActive)
    }
}

@Composable
private fun BottomChrome(
    page: Int,
    total: Int,
    hasPrev: Boolean,
    hasNext: Boolean,
    onPrevChapter: () -> Unit,
    onNextChapter: () -> Unit,
    onScrub: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .fillMaxWidth()
            .background(c.scrim)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        IconBox(Icons.AutoMirrored.Filled.NavigateBefore, "Previous chapter", onClick = onPrevChapter, active = false)
        Slider(
            value = page.toFloat(),
            onValueChange = { onScrub(it.toInt()) },
            valueRange = 1f..total.coerceAtLeast(1).toFloat(),
            modifier = Modifier.weight(1f),
            colors = SliderDefaults.colors(
                thumbColor = c.accent,
                activeTrackColor = c.accent,
                inactiveTrackColor = c.line2,
            ),
        )
        MonoText("$page / $total", size = 12, color = c.ink2)
        IconBox(Icons.AutoMirrored.Filled.NavigateNext, "Next chapter", onClick = onNextChapter, active = false)
    }
}

@Composable
private fun ReaderSettingsPanel(
    view: ReaderView,
    onMode: (ReadMode) -> Unit,
    onDir: (ReadDirection) -> Unit,
    onFit: (ReadFit) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = AppTheming.colors
    Column(
        modifier
            .width(300.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(c.panel)
            .border(1.dp, c.line, RoundedCornerShape(14.dp))
            .padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel("Reading mode")
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                ReadMode.entries.chunked(2).forEach { rowItems ->
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        rowItems.forEach { m ->
                            ModeTile(
                                label = m.label,
                                selected = view.mode == m,
                                onClick = { onMode(m) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel("Direction")
            Segmented(
                options = ReadDirection.entries.map { SegOption(it, it.label, it.icon) },
                value = view.direction,
                onChange = onDir,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SectionLabel("Fit")
            Segmented(
                options = ReadFit.entries.map { SegOption(it, it.label, it.icon) },
                value = view.fit,
                onChange = onFit,
            )
        }
    }
}

@Composable
private fun ModeTile(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = AppTheming.colors
    Box(
        modifier
            .clip(RoundedCornerShape(9.dp))
            .background(if (selected) c.accentSoft else c.bgElevated)
            .border(1.dp, if (selected) c.accentLine else c.line, RoundedCornerShape(9.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 11.dp),
    ) {
        Text(
            label,
            color = if (selected) c.accent else c.ink2,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
