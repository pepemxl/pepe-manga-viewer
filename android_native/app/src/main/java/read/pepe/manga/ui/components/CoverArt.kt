package read.pepe.manga.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import read.pepe.manga.ui.theme.AppTheme
import read.pepe.manga.ui.theme.AppTheming

/**
 * Cover art. Uses [coverUrl] when the backend supplies one; otherwise renders a
 * deterministic generated cover (gradient + initial + tag), echoing the design's
 * `Cover` with `coverBg(hue, grad)`. E-ink themes flatten it to a framed paper tile.
 */
@Composable
fun CoverArt(
    title: String,
    seed: Int,
    kindTag: String?,
    coverUrl: String?,
    modifier: Modifier = Modifier,
    progressPct: Int? = null,
) {
    val c = AppTheming.colors
    val shape = RoundedCornerShape(4.dp)
    Box(
        modifier
            .clip(shape)
            .background(c.panelHi)
            .then(if (c.isEInk) Modifier.border(1.5.dp, c.ink, shape) else Modifier),
    ) {
        if (!coverUrl.isNullOrBlank()) {
            EInkAsyncImage(
                model = coverUrl,
                contentDescription = title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            GeneratedCover(title = title, seed = seed)
        }

        kindTag?.takeIf { it.isNotBlank() }?.let {
            Box(Modifier.align(Alignment.TopStart).padding(8.dp)) { TagPill(it) }
        }
        progressPct?.takeIf { it in 1..100 }?.let {
            Box(Modifier.align(Alignment.BottomStart).fillMaxSize(), contentAlignment = Alignment.BottomStart) {
                ProgressBar(it, height = 3)
            }
        }
    }
}

@Composable
private fun GeneratedCover(title: String, seed: Int) {
    val c = AppTheming.colors
    val initials = title.split(' ', '-', ':')
        .filter { it.isNotBlank() }
        .take(2)
        .joinToString("") { it.first().uppercase() }
        .ifBlank { "?" }

    val brush = if (c.theme == AppTheme.EPAPER || c.theme == AppTheme.KALEIDO) {
        Brush.linearGradient(listOf(c.panel, c.panelHi))
    } else {
        // deterministic two-tone gradient from the seed hue
        val hue = (seed * 47 % 360).toFloat()
        val a = Color.hsv(hue, 0.42f, if (c.bg.luminanceIsDark()) 0.34f else 0.78f)
        val b = Color.hsv((hue + 38f) % 360f, 0.5f, if (c.bg.luminanceIsDark()) 0.22f else 0.66f)
        Brush.linearGradient(listOf(a, b))
    }

    Box(Modifier.fillMaxSize().background(brush), contentAlignment = Alignment.Center) {
        Text(
            initials,
            fontSize = 34.sp,
            fontWeight = FontWeight.ExtraBold,
            color = if (c.isEInk) c.ink3 else Color.White.copy(alpha = 0.92f),
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Clip,
        )
    }
}

private fun Color.luminanceIsDark(): Boolean = (red * 0.299f + green * 0.587f + blue * 0.114f) < 0.5f
