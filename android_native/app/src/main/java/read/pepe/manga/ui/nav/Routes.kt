package read.pepe.manga.ui.nav

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.ui.graphics.vector.ImageVector

object Routes {
    const val HOME = "home"
    const val READING = "reading"
    const val ADD = "add"
    const val SETTINGS = "settings"
    const val SERIES = "series/{id}"
    const val READER = "reader/{chapterId}?page={page}"

    fun series(id: Int) = "series/$id"
    fun reader(chapterId: Int, page: Int = 1) = "reader/$chapterId?page=$page"
}

/** Top-level destinations shown in the left rail (matches the design's NAV). */
enum class TopDestination(val route: String, val label: String, val icon: ImageVector) {
    HOME(Routes.HOME, "Home", Icons.Filled.Home),
    READING(Routes.READING, "Reading", Icons.Filled.BarChart),
    ADD(Routes.ADD, "Add", Icons.Filled.Add),
    SETTINGS(Routes.SETTINGS, "Settings", Icons.Filled.Settings);
}

val BookGlyph: ImageVector = Icons.AutoMirrored.Filled.MenuBook
