package read.pepe.manga

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import read.pepe.manga.di.ServiceLocator
import read.pepe.manga.ui.MangaAppRoot
import read.pepe.manga.ui.theme.AppTheme
import read.pepe.manga.ui.theme.AppThemeProvider
import read.pepe.manga.ui.theme.colorsFor

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val settingsStore = ServiceLocator.settingsStore
        setContent {
            val settings by settingsStore.settings.collectAsStateWithLifecycle(initialValue = null)
            val theme = settings?.theme ?: AppTheme.EPAPER
            AppThemeProvider(theme = theme, imageRenderingOverride = settings?.imageRendering) {
                androidx.compose.foundation.layout.Box(
                    Modifier
                        .fillMaxSize()
                        .background(colorsFor(theme).bg)
                ) {
                    MangaAppRoot()
                }
            }
        }
    }
}
