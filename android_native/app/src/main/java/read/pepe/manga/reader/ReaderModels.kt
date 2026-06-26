package read.pepe.manga.reader

import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.CropPortrait
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.ImportContacts
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material.icons.filled.ViewColumn
import androidx.compose.material.icons.filled.ViewDay

/** Reading modes from reader.jsx MODE_OPTS. */
enum class ReadMode(val key: String, val label: String, val icon: ImageVector) {
    SINGLE("single", "Single", Icons.Filled.CropPortrait),
    DOUBLE("double", "Double", Icons.Filled.ImportContacts),
    VERTICAL("vertical", "Webtoon", Icons.Filled.ViewDay),
    HORIZONTAL("horizontal", "Strip", Icons.Filled.ViewColumn);

    val isContinuous: Boolean get() = this == VERTICAL || this == HORIZONTAL

    companion object {
        fun fromKey(key: String?): ReadMode = entries.firstOrNull { it.key == key } ?: SINGLE
    }
}

enum class ReadDirection(val key: String, val label: String, val icon: ImageVector) {
    RTL("rtl", "Right → Left", Icons.Filled.SwapHoriz),
    LTR("ltr", "Left → Right", Icons.AutoMirrored.Filled.MenuBook);

    val isRtl: Boolean get() = this == RTL

    /** Backend persists "RTL" / "LTR" / "vert"; map to the two paged directions. */
    fun toBackend(): String = if (this == RTL) "RTL" else "LTR"

    companion object {
        fun fromKey(key: String?): ReadDirection =
            when (key?.lowercase()) {
                "rtl" -> RTL
                else -> LTR
            }
    }
}

enum class ReadFit(val key: String, val label: String, val icon: ImageVector) {
    HEIGHT("height", "Fit height", Icons.Filled.SwapVert),
    WIDTH("width", "Fit width", Icons.Filled.SwapHoriz),
    ORIGINAL("original", "Original", Icons.Filled.Fullscreen);

    companion object {
        fun fromKey(key: String?): ReadFit = entries.firstOrNull { it.key == key } ?: HEIGHT
    }
}
