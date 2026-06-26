package read.pepe.manga.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.unit.dp

/** Convenience accessor mirroring `MaterialTheme.colorScheme` usage. */
object AppTheming {
    val colors: AppColors
        @Composable @ReadOnlyComposable get() = LocalAppColors.current
}

private fun shapesFor(theme: AppTheme): Shapes {
    // radius / radius-lg from the design (epaper 2/5, kaleido 3/6, others 4/10)
    val (sm, lg) = when (theme) {
        AppTheme.EPAPER -> 2 to 5
        AppTheme.KALEIDO -> 3 to 6
        else -> 4 to 10
    }
    return Shapes(
        extraSmall = RoundedCornerShape(sm.dp),
        small = RoundedCornerShape((sm + 3).dp),
        medium = RoundedCornerShape(lg.dp),
        large = RoundedCornerShape((lg + 4).dp),
        extraLarge = RoundedCornerShape((lg + 6).dp),
    )
}

@Composable
fun AppThemeProvider(
    theme: AppTheme,
    imageRenderingOverride: ImageRendering? = null,
    content: @Composable () -> Unit,
) {
    val colors = colorsFor(theme)
    // The override wins; otherwise fall back to whatever the theme prescribes.
    val effectiveRendering = imageRenderingOverride ?: colors.imageRendering

    // Bridge into Material 3 so stock components (TextField, Slider, etc.) inherit the palette.
    val isDark = colors.bg.luminance() < 0.5f
    val scheme = if (isDark) {
        darkColorScheme(
            primary = colors.accent,
            onPrimary = colors.accentInk,
            background = colors.bg,
            onBackground = colors.ink,
            surface = colors.panel,
            onSurface = colors.ink,
            surfaceVariant = colors.panelHi,
            onSurfaceVariant = colors.ink2,
            outline = colors.line2,
            error = colors.warn,
        )
    } else {
        lightColorScheme(
            primary = colors.accent,
            onPrimary = colors.accentInk,
            background = colors.bg,
            onBackground = colors.ink,
            surface = colors.panel,
            onSurface = colors.ink,
            surfaceVariant = colors.panelHi,
            onSurfaceVariant = colors.ink2,
            outline = colors.line2,
            error = colors.warn,
        )
    }

    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalImageRendering provides effectiveRendering,
    ) {
        MaterialTheme(
            colorScheme = scheme,
            typography = AppTypography,
            shapes = shapesFor(theme),
            content = content,
        )
    }
}
