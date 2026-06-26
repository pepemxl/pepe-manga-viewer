package read.pepe.manga.ui.misc

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import read.pepe.manga.ui.components.SectionLabel
import read.pepe.manga.ui.theme.AppTheming

/**
 * Library content is imported server-side (the backend scans host folders /
 * .cbz / .cbr). The mobile client is a reader, so this screen points at that
 * flow rather than duplicating filesystem browsing on the device.
 */
@Composable
fun AddScreen() {
    val c = AppTheming.colors
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(Icons.Filled.FolderOpen, contentDescription = null, tint = c.ink3)
        Text("Add to library", style = MaterialTheme.typography.headlineSmall, color = c.ink)
        Text(
            "Series are imported on the server. Add a source folder from the desktop UI " +
                "(Settings → Sources) or drop .cbz / .cbr files into the backend's media folder, " +
                "then re-scan. New series appear here automatically.",
            style = MaterialTheme.typography.bodyLarge,
            color = c.ink3,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp),
        )
        Column(
            Modifier
                .padding(top = 24.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(c.panel)
                .border(1.dp, c.line, RoundedCornerShape(12.dp))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            SectionLabel("Supported")
            Text("• .cbz / .cbr archives", style = MaterialTheme.typography.bodyMedium, color = c.ink2)
            Text("• Loose-image chapter folders", style = MaterialTheme.typography.bodyMedium, color = c.ink2)
            Text("• Manga · Manhwa · Comics · Books", style = MaterialTheme.typography.bodyMedium, color = c.ink2)
        }
    }
}
