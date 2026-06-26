package read.pepe.manga.ui.series

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import read.pepe.manga.data.remote.ChapterDto
import read.pepe.manga.data.remote.SeriesDetailDto
import read.pepe.manga.ui.common.StateHost
import read.pepe.manga.ui.components.CoverArt
import read.pepe.manga.ui.components.IconBox
import read.pepe.manga.ui.components.MonoText
import read.pepe.manga.ui.components.PrimaryButton
import read.pepe.manga.ui.components.ProgressBar
import read.pepe.manga.ui.components.SectionLabel
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun SeriesScreen(
    seriesId: Int,
    onBack: () -> Unit,
    onRead: (chapterId: Int, page: Int) -> Unit,
    vm: SeriesViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    LaunchedEffect(seriesId) { vm.load(seriesId) }

    StateHost(state = state, onRetry = { vm.load(seriesId, force = true) }, modifier = Modifier.fillMaxSize()) { series ->
        SeriesContent(series = series, onBack = onBack, onRead = onRead)
    }
}

@Composable
private fun SeriesContent(
    series: SeriesDetailDto,
    onBack: () -> Unit,
    onRead: (Int, Int) -> Unit,
) {
    val c = AppTheming.colors
    var ascending by rememberSaveable(series.id) { mutableStateOf(true) }
    val sortedChapters = remember(series.chapters, ascending) {
        series.chapters.sortedBy { it.numberSort }.let { if (ascending) it else it.asReversed() }
    }
    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconBox(Icons.AutoMirrored.Filled.ArrowBack, "Back", onClick = onBack)
                Spacer(Modifier.width(8.dp))
                Text(series.kind.uppercase(), style = MaterialTheme.typography.labelSmall, color = c.ink4)
            }
            Spacer(Modifier.height(12.dp))
        }

        // hero
        item {
            Row {
                CoverArt(
                    title = series.title,
                    seed = series.id,
                    kindTag = series.format ?: series.kind,
                    coverUrl = series.coverUrl,
                    modifier = Modifier.width(120.dp).aspectRatio(2f / 3f),
                )
                Spacer(Modifier.width(16.dp))
                Column(Modifier.weight(1f)) {
                    Text(series.title, style = MaterialTheme.typography.headlineSmall, color = c.ink)
                    series.author?.takeIf { it.isNotBlank() }?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(it, style = MaterialTheme.typography.bodyMedium, color = c.ink3)
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        MonoText("${series.chapterCount} ch", size = 12, color = c.ink3)
                        if (series.unreadCount > 0) {
                            Spacer(Modifier.width(8.dp))
                            MonoText("${series.unreadCount} unread", size = 12, color = c.ink3)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    if (series.progressPct > 0) {
                        ProgressBar(series.progressPct, height = 6)
                        Spacer(Modifier.height(6.dp))
                        MonoText("${series.progressPct}%", size = 11, color = c.accent)
                        Spacer(Modifier.height(12.dp))
                    }
                    val target = series.resumeTarget()
                    if (target != null) {
                        PrimaryButton(
                            label = if (series.progressPct > 0) "Resume" else "Read",
                            icon = Icons.Filled.PlayArrow,
                            onClick = { onRead(target.first, target.second) },
                        )
                    }
                }
            }
        }

        series.description?.takeIf { it.isNotBlank() }?.let { desc ->
            item {
                Spacer(Modifier.height(8.dp))
                Text(desc, style = MaterialTheme.typography.bodyLarge, color = c.ink2)
            }
        }

        item {
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                SectionLabel("Chapters")
                SortToggle(ascending = ascending, onToggle = { ascending = !ascending })
            }
            Spacer(Modifier.height(6.dp))
        }

        items(sortedChapters, key = { it.id }) { ch ->
            ChapterRow(ch = ch, onClick = {
                val page = if (ch.progressPage > 0) ch.progressPage else 1
                onRead(ch.id, page)
            })
        }
    }
}

@Composable
private fun SortToggle(ascending: Boolean, onToggle: () -> Unit) {
    val c = AppTheming.colors
    Row(
        Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(c.panel)
            .border(1.dp, c.line, RoundedCornerShape(8.dp))
            .clickable(onClick = onToggle)
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Filled.SwapVert,
            contentDescription = "Invert chapter order",
            tint = c.ink3,
            modifier = Modifier.width(16.dp),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            if (ascending) "Oldest first" else "Newest first",
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = c.ink3,
        )
    }
}

@Composable
private fun ChapterRow(ch: ChapterDto, onClick: () -> Unit) {
    val c = AppTheming.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(c.panel)
            .border(1.dp, c.line, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MonoText(ch.number.padStart(2, '0'), size = 12, weight = FontWeight.SemiBold, color = c.ink3)
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(
                ch.title ?: "Chapter ${ch.number}",
                style = MaterialTheme.typography.titleMedium,
                color = c.ink,
                maxLines = 1,
            )
            if (ch.pageCount > 0) {
                Spacer(Modifier.height(2.dp))
                MonoText("${ch.pageCount} pages", size = 10, color = c.ink4)
            }
        }
        if (ch.finished) {
            Icon(Icons.Filled.Check, contentDescription = "Read", tint = c.ink4, modifier = Modifier.width(18.dp))
        } else if (ch.progressPage > 0) {
            MonoText("p.${ch.progressPage}", size = 10, color = c.accent)
        }
    }
}
