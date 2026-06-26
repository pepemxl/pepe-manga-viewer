package read.pepe.manga.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * The web design uses "Schibsted Grotesk" (UI) + "Geist Mono" (numerals).
 * To stay binary-free we map UI → the platform sans and mono → [FontFamily.Monospace],
 * preserving the design's weight/letter-spacing rhythm.
 */
val AppTypography = Typography(
    displaySmall = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, letterSpacing = (-0.02 * 26).sp),
    headlineMedium = TextStyle(fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, letterSpacing = (-0.02 * 24).sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp, letterSpacing = (-0.01 * 18).sp),
    titleLarge = TextStyle(fontWeight = FontWeight.Bold, fontSize = 15.sp, letterSpacing = (-0.01 * 15).sp),
    titleMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp),
    bodyLarge = TextStyle(fontWeight = FontWeight.Normal, fontSize = 14.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 13.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
    labelMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 12.5.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 0.09.em()),
)

/** `.mono` from the design — tabular-ish numerals for counts, page indicators. */
val MonoFamily: FontFamily = FontFamily.Monospace

@Composable
@ReadOnlyComposable
fun monoStyle(size: Int = 12, weight: FontWeight = FontWeight.Medium): TextStyle =
    TextStyle(fontFamily = MonoFamily, fontSize = size.sp, fontWeight = weight)

/** `.rdr-lbl` — uppercase micro-labels used for section headers in the design. */
@Composable
@ReadOnlyComposable
fun railLabelStyle(): TextStyle =
    TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.09.em())

private fun Double.em() = (this * 11).sp // approximate em→sp for the small label sizes
