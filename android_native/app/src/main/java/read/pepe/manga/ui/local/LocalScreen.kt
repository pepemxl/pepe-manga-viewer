package read.pepe.manga.ui.local

import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import read.pepe.manga.ui.components.PrimaryButton
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun LocalScreen(
    onOpenSeries: (String) -> Unit,
    vm: LocalViewModel = viewModel(),
) {
    val c = AppTheming.colors
    val context = LocalContext.current
    val series by vm.series.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()
    val message by vm.message.collectAsStateWithLifecycle()

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocumentTree(),
    ) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri, Intent.FLAG_GRANT_READ_URI_PERMISSION,
                )
            }
            vm.import(context, uri)
        }
    }

    Column(
        Modifier.fillMaxSize().background(c.bg).padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Local library", color = c.ink, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            PrimaryButton(label = "Add folder", onClick = { picker.launch(null) })
        }
        Text(
            "Import a folder of .cbz/.zip chapters or images. Pages are copied into " +
                "your local storage and read entirely on-device.",
            color = c.ink3, fontSize = 13.sp,
        )
        if (busy) Text("importing…", color = c.ink3, fontSize = 12.sp)
        message?.let { Text(it, color = c.ink2, fontSize = 12.sp) }

        if (series.isEmpty()) {
            Text("No local series yet — tap “Add folder”.", color = c.ink3, fontSize = 14.sp)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(series, key = { it.id }) { s ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(c.panel)
                            .clickable { onOpenSeries(s.id) }
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(s.title, color = c.ink, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                        Text("${s.chapters.size} ch", color = c.ink3, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
