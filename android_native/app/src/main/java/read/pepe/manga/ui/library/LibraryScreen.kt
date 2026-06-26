package read.pepe.manga.ui.library

import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import read.pepe.manga.data.remote.SeriesSummaryDto
import read.pepe.manga.ui.common.StateHost
import read.pepe.manga.ui.components.ChipToggle
import read.pepe.manga.ui.components.CoverArt
import read.pepe.manga.ui.components.MonoText
import read.pepe.manga.ui.components.PrimaryButton
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun LibraryScreen(
    onOpenSeries: (Int) -> Unit,
    onAdd: () -> Unit,
    vm: LibraryViewModel = viewModel(),
) {
    val c = AppTheming.colors
    val state by vm.state.collectAsStateWithLifecycle()
    val filters by vm.filters.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(20.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Home", style = MaterialTheme.typography.headlineMedium, color = c.ink)
            Spacer(Modifier.weight(1f))
            PrimaryButton(label = "Add", icon = Icons.Filled.Add, onClick = onAdd)
        }
        Spacer(Modifier.height(14.dp))

        OutlinedTextField(
            value = filters.query,
            onValueChange = vm::setQuery,
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = c.ink4) },
            placeholder = { Text("Search library…", color = c.ink4) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = c.accentLine,
                unfocusedBorderColor = c.line2,
                focusedTextColor = c.ink,
                unfocusedTextColor = c.ink,
                cursorColor = c.accent,
                focusedContainerColor = c.panel,
                unfocusedContainerColor = c.panel,
            ),
        )

        Spacer(Modifier.height(12.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(SHELVES) { (key, label) ->
                ChipToggle(label, selected = filters.shelf == key, onClick = { vm.setShelf(key) })
            }
        }
        Spacer(Modifier.height(8.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(TYPES) { (key, label) ->
                ChipToggle(label, selected = filters.type == key, onClick = { vm.setType(key) })
            }
        }
        Spacer(Modifier.height(14.dp))

        StateHost(state = state, onRetry = vm::load, modifier = Modifier.fillMaxSize()) { items ->
            val list = vm.visible(items)
            if (list.isEmpty()) {
                Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                    Spacer(Modifier.height(64.dp))
                    Text("No series here yet", color = c.ink3)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(minSize = 132.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                    contentPadding = PaddingValues(bottom = 28.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(list, key = { it.id }) { s ->
                        SeriesCard(series = s, onClick = { onOpenSeries(s.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun SeriesCard(series: SeriesSummaryDto, onClick: () -> Unit) {
    val c = AppTheming.colors
    Column(Modifier.clickable(onClick = onClick)) {
        CoverArt(
            title = series.title,
            seed = series.id,
            kindTag = series.format ?: series.kind,
            coverUrl = series.coverUrl,
            progressPct = series.progressPct,
            modifier = Modifier.fillMaxWidth().aspectRatio(2f / 3f),
        )
        Spacer(Modifier.height(8.dp))
        Text(
            series.title,
            style = MaterialTheme.typography.titleMedium,
            color = c.ink,
            maxLines = 2,
        )
        Spacer(Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                buildString {
                    append(series.kind)
                    series.language?.let { append(" · $it") }
                    append(" · ${series.chapterCount} ch")
                },
                style = MaterialTheme.typography.bodyMedium,
                color = c.ink3,
                maxLines = 1,
            )
            Spacer(Modifier.weight(1f))
            if (series.progressPct in 1..100) {
                MonoText("${series.progressPct}%", size = 10, weight = FontWeight.SemiBold, color = c.accent)
            }
        }
    }
}
