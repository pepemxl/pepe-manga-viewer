package read.pepe.manga.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import read.pepe.manga.ui.theme.AppTheming
import read.pepe.manga.ui.theme.monoStyle
import read.pepe.manga.ui.theme.railLabelStyle

/** `.rdr-lbl` — uppercase micro section label. */
@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(text.uppercase(), modifier = modifier, style = railLabelStyle(), color = AppTheming.colors.ink4)
}

/** Tabular numerals — `.mono`. */
@Composable
fun MonoText(
    text: String,
    modifier: Modifier = Modifier,
    size: Int = 12,
    weight: FontWeight = FontWeight.Medium,
    color: androidx.compose.ui.graphics.Color = AppTheming.colors.ink2,
) {
    Text(text, modifier = modifier, style = monoStyle(size, weight), color = color)
}

/** `.chip-toggle` — pill toggle used for type/genre filters. */
@Composable
fun ChipToggle(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = AppTheming.colors
    Box(
        modifier
            .clip(CircleShape)
            .background(if (selected) c.accentSoft else c.panel)
            .border(1.dp, if (selected) c.accentLine else c.line, CircleShape)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            fontSize = 12.5.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) c.accent else c.ink3,
        )
    }
}

/** `.prog-fill` progress bar (flat in e-ink, gradient-ish otherwise). */
@Composable
fun ProgressBar(pct: Int, modifier: Modifier = Modifier, height: Int = 4) {
    val c = AppTheming.colors
    Box(
        modifier
            .fillMaxWidth()
            .height(height.dp)
            .clip(CircleShape)
            .background(c.line2),
    ) {
        Box(
            Modifier
                .fillMaxWidth(fraction = (pct.coerceIn(0, 100) / 100f))
                .height(height.dp)
                .clip(CircleShape)
                .background(c.accent),
        )
    }
}

/** Left-rail nav button — `.nav-item` / `.rail-btn`. */
@Composable
fun RailButton(
    icon: ImageVector,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val c = AppTheming.colors
    Box(
        Modifier
            .clip(RoundedCornerShape(13.dp))
            .background(if (selected) c.accentSoft else androidx.compose.ui.graphics.Color.Transparent)
            .then(if (selected) Modifier.border(1.dp, c.accentLine, RoundedCornerShape(13.dp)) else Modifier)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .height(40.dp),
        contentAlignment = Alignment.Center,
    ) {
        androidx.compose.foundation.layout.Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Icon(icon, contentDescription = label, tint = if (selected) c.accent else c.ink3)
            Text(
                label,
                fontSize = 9.5.sp,
                fontWeight = FontWeight.Bold,
                color = if (selected) c.accent else c.ink3,
            )
        }
    }
}

/** Status / type tag pill — `.mono` tag chip. */
@Composable
fun TagPill(text: String, modifier: Modifier = Modifier) {
    val c = AppTheming.colors
    Box(
        modifier
            .clip(RoundedCornerShape(4.dp))
            .background(c.panelHi)
            .border(1.dp, c.line, RoundedCornerShape(4.dp))
            .padding(horizontal = 7.dp, vertical = 3.dp),
    ) {
        Text(text.uppercase(), style = monoStyle(9, FontWeight.Bold), color = c.ink3)
    }
}

@Composable
fun EllipsisText(
    text: String,
    modifier: Modifier = Modifier,
    color: androidx.compose.ui.graphics.Color = AppTheming.colors.ink,
    style: androidx.compose.ui.text.TextStyle = androidx.compose.material3.MaterialTheme.typography.titleMedium,
    maxLines: Int = 1,
) {
    Text(text, modifier = modifier, color = color, style = style, maxLines = maxLines, overflow = TextOverflow.Ellipsis)
}

@Composable
fun RowChips(content: @Composable () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
        content()
    }
}
