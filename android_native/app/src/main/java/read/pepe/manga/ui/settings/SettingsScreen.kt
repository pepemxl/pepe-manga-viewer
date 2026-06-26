package read.pepe.manga.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import read.pepe.manga.reader.ReadDirection
import read.pepe.manga.reader.ReadFit
import read.pepe.manga.reader.ReadMode
import read.pepe.manga.ui.components.PrimaryButton
import read.pepe.manga.ui.components.SectionLabel
import read.pepe.manga.ui.components.SegOption
import read.pepe.manga.ui.components.Segmented
import read.pepe.manga.ui.theme.AppTheme
import read.pepe.manga.ui.theme.AppTheming
import read.pepe.manga.ui.theme.colorsFor

@Composable
fun SettingsScreen(vm: SettingsViewModel = viewModel()) {
    val c = AppTheming.colors
    val settings by vm.settings.collectAsStateWithLifecycle()
    val s = settings ?: return

    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(22.dp),
    ) {
        Text("Settings", style = MaterialTheme.typography.headlineMedium, color = c.ink)

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel("Display panel")
            Text(
                "Mono and color e-paper modes flatten color, drop animation and " +
                    "filter page art to match the hardware.",
                style = MaterialTheme.typography.bodyMedium,
                color = c.ink3,
            )
            AppTheme.entries.forEach { theme ->
                ThemeRow(theme = theme, selected = s.theme == theme, onClick = { vm.setTheme(theme) })
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel("Server")
            ServerField(initial = s.baseUrl, onSave = vm::setBaseUrl)
        }

        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            SectionLabel("Reading mode")
            Segmented(
                options = ReadMode.entries.map { SegOption(it, it.label, it.icon) },
                value = s.defaultMode,
                onChange = vm::setMode,
            )
            SectionLabel("Direction")
            Segmented(
                options = ReadDirection.entries.map { SegOption(it, it.label, it.icon) },
                value = s.defaultDirection,
                onChange = vm::setDirection,
            )
            SectionLabel("Fit")
            Segmented(
                options = ReadFit.entries.map { SegOption(it, it.label, it.icon) },
                value = s.defaultFit,
                onChange = vm::setFit,
            )
        }
    }
}

@Composable
private fun ThemeRow(theme: AppTheme, selected: Boolean, onClick: () -> Unit) {
    val c = AppTheming.colors
    val swatch = colorsFor(theme)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) c.accentSoft else c.panel)
            .border(1.dp, if (selected) c.accentLine else c.line, RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(0.dp)) {
            SwatchDot(swatch.bg)
            SwatchDot(swatch.ink)
            SwatchDot(swatch.accent)
        }
        Spacer(Modifier.width(12.dp))
        Text(
            theme.label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) c.accent else c.ink,
        )
    }
}

@Composable
private fun SwatchDot(color: androidx.compose.ui.graphics.Color) {
    val c = AppTheming.colors
    Box(
        Modifier
            .size(18.dp)
            .clip(CircleShape)
            .background(color)
            .border(1.dp, c.line2, CircleShape),
    )
}

@Composable
private fun ServerField(initial: String, onSave: (String) -> Unit) {
    val c = AppTheming.colors
    var url by rememberSaveable(initial) { mutableStateOf(initial) }
    val dirty = remember(url, initial) { url.trim().trimEnd('/') != initial }

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            modifier = Modifier.weight(1f),
            singleLine = true,
            label = { Text("Backend URL") },
            placeholder = { Text("http://10.0.2.2:8202") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = c.accentLine,
                unfocusedBorderColor = c.line2,
                focusedLabelColor = c.accent,
                cursorColor = c.accent,
                focusedTextColor = c.ink,
                unfocusedTextColor = c.ink,
            ),
        )
        PrimaryButton(label = "Save", onClick = { onSave(url) })
    }
    if (dirty) {
        Text("Tap Save to switch servers.", style = MaterialTheme.typography.bodyMedium, color = c.ink4)
    }
}
