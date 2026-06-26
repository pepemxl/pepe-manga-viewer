package read.pepe.manga.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import read.pepe.manga.ui.theme.AppTheming

data class SegOption<T>(val value: T, val label: String, val icon: ImageVector? = null)

/** `Segmented` from the design — pill group with a single active segment. */
@Composable
fun <T> Segmented(
    options: List<SegOption<T>>,
    value: T,
    onChange: (T) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .clip(RoundedCornerShape(9.dp))
            .background(c.bgElevated)
            .border(1.dp, c.line, RoundedCornerShape(9.dp))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        options.forEach { opt ->
            val on = opt.value == value
            Row(
                Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(if (on) c.panelHi else Color.Transparent)
                    .then(if (on && c.isEInk) Modifier.border(1.dp, c.ink, RoundedCornerShape(6.dp)) else Modifier)
                    .clickable { onChange(opt.value) }
                    .padding(horizontal = 11.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                opt.icon?.let { Icon(it, contentDescription = null, tint = if (on) c.ink else c.ink3) }
                Text(
                    opt.label,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (on) c.ink else c.ink3,
                )
            }
        }
    }
}
