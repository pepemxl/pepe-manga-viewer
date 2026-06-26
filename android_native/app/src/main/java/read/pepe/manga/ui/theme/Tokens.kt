package read.pepe.manga.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * The five themes ported verbatim from the claude.ai/design project
 * "Manga Viewer V2" (styles.css `[data-theme]` blocks).
 *
 * EPAPER (mono e-ink) and KALEIDO (color e-ink) are the headline modes — both
 * kill animation and apply an image color filter. EPAPER is the default.
 */
enum class AppTheme(val key: String, val label: String) {
    EPAPER("epaper", "E-paper (mono)"),
    KALEIDO("kaleido", "Color e-paper"),
    DARK("dark", "Dark"),
    LIGHT("light", "Light"),
    SEPIA("sepia", "Sepia");

    companion object {
        fun fromKey(key: String?): AppTheme = entries.firstOrNull { it.key == key } ?: EPAPER
    }
}

/** How reader/cover images are filtered to emulate the panel hardware. */
enum class ImageRendering { FULL_COLOR, GRAYSCALE, DESATURATE }

/**
 * Design tokens. Field names map 1:1 to the CSS custom properties:
 * `--bg` → [bg], `--ink-2` → [ink2], `--accent-soft` → [accentSoft], etc.
 */
@Immutable
data class AppColors(
    val theme: AppTheme,
    // surfaces
    val bg: Color,
    val bgElevated: Color,    // --bg-2
    val panel: Color,
    val panel2: Color,
    val panelHi: Color,
    // hairlines
    val line: Color,
    val line2: Color,
    // text tiers
    val ink: Color,
    val ink2: Color,
    val ink3: Color,
    val ink4: Color,
    // accent
    val accent: Color,
    val accentSoft: Color,
    val accentLine: Color,
    val accentInk: Color,
    // misc
    val scrim: Color,
    val ok: Color,
    val warn: Color,
    // behaviour flags driven by the e-ink themes
    val animate: Boolean,
    val imageRendering: ImageRendering,
) {
    val isEInk: Boolean get() = theme == AppTheme.EPAPER || theme == AppTheme.KALEIDO
}

private val DarkColors = AppColors(
    theme = AppTheme.DARK,
    bg = Color(0xFF1B1A1F),
    bgElevated = Color(0xFF161519),
    panel = Color(0xFF232229),
    panel2 = Color(0xFF2A2830),
    panelHi = Color(0xFF33313A),
    line = Color(0x14FFFFFF),
    line2 = Color(0x24FFFFFF),
    ink = Color(0xFFF2F1F4),
    ink2 = Color(0xFFC0BEC6),
    ink3 = Color(0xFF8A8891),
    ink4 = Color(0xFF67656E),
    accent = Color(0xFFB46CFF),
    accentSoft = Color(0x29B46CFF),
    accentLine = Color(0x6BB46CFF),
    accentInk = Color(0xFFFFFFFF),
    scrim = Color(0xB8121116),
    ok = Color(0xFF46B083),
    warn = Color(0xFFC9A23A),
    animate = true,
    imageRendering = ImageRendering.FULL_COLOR,
)

private val LightColors = AppColors(
    theme = AppTheme.LIGHT,
    bg = Color(0xFFF5F4F6),
    bgElevated = Color(0xFFEDECEF),
    panel = Color(0xFFFFFFFF),
    panel2 = Color(0xFFFAFAFB),
    panelHi = Color(0xFFEFEEF1),
    line = Color(0x1A26242E),
    line2 = Color(0x2E26242E),
    ink = Color(0xFF2F2D36),
    ink2 = Color(0xFF5C5A64),
    ink3 = Color(0xFF817F89),
    ink4 = Color(0xFFA3A1AA),
    accent = Color(0xFFB46CFF),
    accentSoft = Color(0x29B46CFF),
    accentLine = Color(0x6BB46CFF),
    accentInk = Color(0xFFFFFFFF),
    scrim = Color(0xB3FCFCFC),
    ok = Color(0xFF2E9E6A),
    warn = Color(0xFFB98A1E),
    animate = true,
    imageRendering = ImageRendering.FULL_COLOR,
)

private val SepiaColors = AppColors(
    theme = AppTheme.SEPIA,
    bg = Color(0xFFECE2D2),
    bgElevated = Color(0xFFE2D6C2),
    panel = Color(0xFFF3EADB),
    panel2 = Color(0xFFEBDFCD),
    panelHi = Color(0xFFE0D2BC),
    line = Color(0x243F3322),
    line2 = Color(0x3D3F3322),
    ink = Color(0xFF4A3D2E),
    ink2 = Color(0xFF685844),
    ink3 = Color(0xFF82725C),
    ink4 = Color(0xFF9D8E78),
    accent = Color(0xFFB46CFF),
    accentSoft = Color(0x29B46CFF),
    accentLine = Color(0x6BB46CFF),
    accentInk = Color(0xFFFFFFFF),
    scrim = Color(0xB8F0E6D5),
    ok = Color(0xFF5C7E4A),
    warn = Color(0xFF9A7A2E),
    animate = true,
    imageRendering = ImageRendering.FULL_COLOR,
)

// Exact hex copied from styles.css [data-theme="epaper"].
private val EpaperColors = AppColors(
    theme = AppTheme.EPAPER,
    bg = Color(0xFFFFFFFF),
    bgElevated = Color(0xFFF1F1EE),
    panel = Color(0xFFFFFFFF),
    panel2 = Color(0xFFFAFAF8),
    panelHi = Color(0xFFE9E9E5),
    line = Color(0x26000000),
    line2 = Color(0x47000000),
    ink = Color(0xFF000000),
    ink2 = Color(0xFF191919),
    ink3 = Color(0xFF3A3A3A),
    ink4 = Color(0xFF5E5E5E),
    accent = Color(0xFF141414),
    accentSoft = Color(0xFFE4E4E0),
    accentLine = Color(0x45000000),
    accentInk = Color(0xFFFFFFFF),
    scrim = Color(0xBAFFFFFF),
    ok = Color(0xFF1F1F1F),
    warn = Color(0xFF1F1F1F),
    animate = false,
    imageRendering = ImageRendering.GRAYSCALE,
)

// Exact hex copied from styles.css [data-theme="kaleido"] (Boox Kaleido 3).
private val KaleidoColors = AppColors(
    theme = AppTheme.KALEIDO,
    bg = Color(0xFFE9E8E2),
    bgElevated = Color(0xFFDEDCD4),
    panel = Color(0xFFF3F2EC),
    panel2 = Color(0xFFEBE9E2),
    panelHi = Color(0xFFDBD9D0),
    line = Color(0x22000000),
    line2 = Color(0x42000000),
    ink = Color(0xFF1B1A17),
    ink2 = Color(0xFF35332D),
    ink3 = Color(0xFF57544C),
    ink4 = Color(0xFF76736A),
    accent = Color(0xFF74628F),
    accentSoft = Color(0x2974628F),
    accentLine = Color(0x6B74628F),
    accentInk = Color(0xFFF5F2EC),
    scrim = Color(0xC2E9E8E2),
    ok = Color(0xFF59805F),
    warn = Color(0xFF9A8247),
    animate = false,
    imageRendering = ImageRendering.DESATURATE,
)

fun colorsFor(theme: AppTheme): AppColors = when (theme) {
    AppTheme.EPAPER -> EpaperColors
    AppTheme.KALEIDO -> KaleidoColors
    AppTheme.DARK -> DarkColors
    AppTheme.LIGHT -> LightColors
    AppTheme.SEPIA -> SepiaColors
}

val LocalAppColors = staticCompositionLocalOf { EpaperColors }
