package read.pepe.manga.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import read.pepe.manga.ui.theme.AppTheming

/** `.sk-btn-primary` — solid accent button. */
@Composable
fun PrimaryButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .clip(RoundedCornerShape(7.dp))
            .background(c.accent)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon?.let { Icon(it, contentDescription = null, tint = c.accentInk) }
        Text(label, color = c.accentInk, fontWeight = FontWeight.Bold, fontSize = 14.sp)
    }
}

/** Soft accent button — `accentSoft` kind. */
@Composable
fun SoftButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .clip(RoundedCornerShape(7.dp))
            .background(c.accentSoft)
            .border(1.dp, c.accentLine, RoundedCornerShape(7.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon?.let { Icon(it, contentDescription = null, tint = c.accent) }
        Text(label, color = c.accent, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp)
    }
}

/** Outlined ghost button — `.sk-btn`. */
@Composable
fun GhostButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
) {
    val c = AppTheming.colors
    Row(
        modifier
            .clip(RoundedCornerShape(7.dp))
            .border(BorderStroke(1.dp, c.line2), RoundedCornerShape(7.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        horizontalArrangement = Arrangement.spacedBy(7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        icon?.let { Icon(it, contentDescription = null, tint = c.ink2) }
        Text(label, color = c.ink2, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp)
    }
}

@Composable
fun RetryButton(onClick: () -> Unit, modifier: Modifier = Modifier) {
    PrimaryButton(label = "Retry", onClick = onClick, modifier = modifier)
}

/** `IconBtn` from the design — square icon button, optional active state. */
@Composable
fun IconBox(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    active: Boolean = false,
    size: Int = 34,
) {
    val c = AppTheming.colors
    androidx.compose.foundation.layout.Box(
        modifier
            .clip(RoundedCornerShape(8.dp))
            .background(if (active) c.accentSoft else androidx.compose.ui.graphics.Color.Transparent)
            .then(if (active) Modifier.border(1.dp, c.accentLine, RoundedCornerShape(8.dp)) else Modifier)
            .clickable(onClick = onClick)
            .padding(0.dp)
            .androidSize(size),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = contentDescription, tint = if (active) c.accent else c.ink2)
    }
}

private fun Modifier.androidSize(size: Int): Modifier = this.then(Modifier.size(size.dp))
