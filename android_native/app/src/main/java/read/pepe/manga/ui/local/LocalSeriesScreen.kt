package read.pepe.manga.ui.local

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import read.pepe.manga.ui.components.GhostButton
import read.pepe.manga.ui.components.IconBox
import read.pepe.manga.ui.components.PrimaryButton
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun LocalSeriesScreen(
    seriesId: String,
    onBack: () -> Unit,
    onRead: (seriesId: String, chapterId: String) -> Unit,
    vm: LocalViewModel = viewModel(),
) {
    val c = AppTheming.colors
    val all by vm.series.collectAsStateWithLifecycle()
    val series = all.find { it.id == seriesId }

    Column(
        Modifier.fillMaxSize().background(c.bg).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            IconBox(icon = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", onClick = onBack)
            Text(series?.title ?: "Local series", color = c.ink, fontWeight = FontWeight.Bold, fontSize = 20.sp)
        }

        if (series == null) {
            Text("This local series is no longer available.", color = c.ink3, fontSize = 14.sp)
            return@Column
        }

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            series.chapters.firstOrNull()?.let { first ->
                PrimaryButton(label = "Read", onClick = { onRead(series.id, first.id) })
            }
            GhostButton(label = "Remove", onClick = { vm.remove(series.id); onBack() })
        }
        Text("${series.chapters.size} chapters · stored locally", color = c.ink3, fontSize = 12.sp)

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(series.chapters, key = { it.id }) { ch ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(c.panel)
                        .clickable { onRead(series.id, ch.id) }
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(ch.title.ifBlank { ch.number }, color = c.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    Text("${ch.pages.size} pages", color = c.ink3, fontSize = 12.sp)
                }
            }
        }
    }
}
