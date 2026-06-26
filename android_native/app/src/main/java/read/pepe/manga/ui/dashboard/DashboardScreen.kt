package read.pepe.manga.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import read.pepe.manga.data.remote.InProgressItemDto
import read.pepe.manga.ui.common.StateHost
import read.pepe.manga.ui.components.CoverArt
import read.pepe.manga.ui.components.IconBox
import read.pepe.manga.ui.components.MonoText
import read.pepe.manga.ui.components.ProgressBar
import read.pepe.manga.ui.components.SectionLabel
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun DashboardScreen(
    onOpenSeries: (Int) -> Unit,
    onRead: (chapterId: Int, page: Int) -> Unit,
    vm: DashboardViewModel = viewModel(),
) {
    val c = AppTheming.colors
    val state by vm.state.collectAsStateWithLifecycle()

    StateHost(state = state, onRetry = vm::load, modifier = Modifier.fillMaxSize()) { data ->
        LazyColumn(
            Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 20.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item { Text("Reading", style = MaterialTheme.typography.headlineMedium, color = c.ink) }

            item {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard("Pages", "${data.stats.pagesMonth}", "this month", Modifier.weight(1f))
                    StatCard("Chapters", "${data.stats.chaptersMonth}", "finished", Modifier.weight(1f))
                    StatCard("Streak", "${data.stats.streakDays}", "days", Modifier.weight(1f))
                }
            }

            item {
                if (data.stats.pagesPerDay.isNotEmpty()) {
                    Column(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(c.panel)
                            .border(1.dp, c.line, RoundedCornerShape(12.dp)).padding(16.dp),
                    ) {
                        SectionLabel("Pages / day (30d)")
                        Spacer(Modifier.height(12.dp))
                        WeekBars(data.stats.pagesPerDay)
                    }
                }
            }

            if (data.inProgress.isNotEmpty()) {
                item { SectionLabel("Continue reading") }
                items(data.inProgress, key = { it.seriesId }) { item ->
                    InProgressRow(
                        item = item,
                        onOpen = { onOpenSeries(item.seriesId) },
                        onRead = { onRead(item.chapterId, item.page.coerceAtLeast(1)) },
                    )
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, sub: String, modifier: Modifier = Modifier) {
    val c = AppTheming.colors
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(c.panel)
            .border(1.dp, c.line, RoundedCornerShape(12.dp))
            .padding(14.dp),
    ) {
        SectionLabel(label)
        Spacer(Modifier.height(6.dp))
        MonoText(value, size = 26, weight = FontWeight.Bold, color = c.ink)
        MonoText(sub, size = 10, color = c.ink4)
    }
}

@Composable
private fun WeekBars(values: List<Int>) {
    val c = AppTheming.colors
    val max = (values.maxOrNull() ?: 1).coerceAtLeast(1)
    Row(
        Modifier.fillMaxWidth().height(70.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        values.takeLast(30).forEach { v ->
            val frac = v.toFloat() / max
            Box(
                Modifier
                    .weight(1f)
                    .fillMaxHeight(fraction = frac.coerceIn(0.02f, 1f))
                    .clip(RoundedCornerShape(2.dp))
                    .background(if (v > 0) c.accent else c.line2),
            )
        }
    }
}

@Composable
private fun InProgressRow(item: InProgressItemDto, onOpen: () -> Unit, onRead: () -> Unit) {
    val c = AppTheming.colors
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(c.panel)
            .border(1.dp, c.line, RoundedCornerShape(10.dp))
            .clickable(onClick = onOpen)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CoverArt(
            title = item.title,
            seed = item.seriesId,
            kindTag = item.kind,
            coverUrl = null,
            modifier = Modifier.width(44.dp).height(60.dp),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(item.title, style = MaterialTheme.typography.titleMedium, color = c.ink, maxLines = 1)
            Spacer(Modifier.height(4.dp))
            MonoText("Ch. ${item.chapter} · p.${item.page}/${item.pageCount}", size = 10, color = c.ink3)
            Spacer(Modifier.height(6.dp))
            ProgressBar(item.progressPct, height = 4)
        }
        Spacer(Modifier.width(10.dp))
        IconBox(Icons.Filled.PlayArrow, "Resume", onClick = onRead, active = true)
    }
}
