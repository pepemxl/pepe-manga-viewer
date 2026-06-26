package read.pepe.manga.ui.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import read.pepe.manga.ui.theme.ImageRendering
import read.pepe.manga.ui.theme.LocalImageRendering

/**
 * Color filter that emulates the active panel:
 *  - GRAYSCALE  → mono e-ink (epaper), with a slight contrast push (×1.16, like the CSS)
 *  - DESATURATE → Kaleido color e-ink (saturation 0.58, the CFA veil)
 *  - FULL_COLOR → no filter
 */
@Composable
fun panelColorFilter(): ColorFilter? = when (LocalImageRendering.current) {
    ImageRendering.GRAYSCALE -> remember {
        val c = 1.16f
        val t = (-0.5f * c + 0.5f) * 255f
        val gray = ColorMatrix().apply { setToSaturation(0f) }
        val contrast = ColorMatrix(
            floatArrayOf(
                c, 0f, 0f, 0f, t,
                0f, c, 0f, 0f, t,
                0f, 0f, c, 0f, t,
                0f, 0f, 0f, 1f, 0f,
            )
        )
        gray.timesAssign(contrast)
        ColorFilter.colorMatrix(gray)
    }
    ImageRendering.DESATURATE -> remember {
        ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(0.58f) })
    }
    ImageRendering.FULL_COLOR -> null
}

/** AsyncImage that applies the active panel-emulation filter automatically. */
@Composable
fun EInkAsyncImage(
    model: Any?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Fit,
) {
    AsyncImage(
        model = model,
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = contentScale,
        colorFilter = panelColorFilter(),
    )
}
