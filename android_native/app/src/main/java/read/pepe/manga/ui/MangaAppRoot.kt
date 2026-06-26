package read.pepe.manga.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import read.pepe.manga.ui.components.RailButton
import read.pepe.manga.ui.dashboard.DashboardScreen
import read.pepe.manga.ui.library.LibraryScreen
import read.pepe.manga.ui.misc.AddScreen
import read.pepe.manga.ui.nav.BookGlyph
import read.pepe.manga.ui.nav.Routes
import read.pepe.manga.ui.nav.TopDestination
import read.pepe.manga.ui.reader.ReaderScreen
import read.pepe.manga.ui.series.SeriesScreen
import read.pepe.manga.ui.settings.SettingsScreen
import read.pepe.manga.ui.theme.AppTheming

@Composable
fun MangaAppRoot() {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val immersive = route == Routes.READER // reader hides the rail

    Row(Modifier.fillMaxSize()) {
        if (!immersive) {
            LeftRail(currentRoute = route, onSelect = { dest ->
                nav.navigate(dest.route) {
                    popUpTo(Routes.HOME) { saveState = true }
                    launchSingleTop = true
                    restoreState = true
                }
            })
        }

        NavHost(
            navController = nav,
            startDestination = Routes.HOME,
            modifier = Modifier.weight(1f).fillMaxHeight(),
        ) {
            composable(Routes.HOME) {
                LibraryScreen(
                    onOpenSeries = { nav.navigate(Routes.series(it)) },
                    onAdd = { nav.navigate(Routes.ADD) },
                )
            }
            composable(Routes.READING) {
                DashboardScreen(
                    onOpenSeries = { nav.navigate(Routes.series(it)) },
                    onRead = { chapterId, page -> nav.navigate(Routes.reader(chapterId, page)) },
                )
            }
            composable(Routes.ADD) { AddScreen() }
            composable(Routes.SETTINGS) { SettingsScreen() }

            composable(
                Routes.SERIES,
                arguments = listOf(navArgument("id") { type = NavType.IntType }),
            ) { entry ->
                val id = entry.arguments?.getInt("id") ?: return@composable
                SeriesScreen(
                    seriesId = id,
                    onBack = { nav.popBackStack() },
                    onRead = { chapterId, page -> nav.navigate(Routes.reader(chapterId, page)) },
                )
            }

            composable(
                Routes.READER,
                arguments = listOf(
                    navArgument("chapterId") { type = NavType.IntType },
                    navArgument("page") { type = NavType.IntType; defaultValue = 1 },
                ),
            ) { entry ->
                val chapterId = entry.arguments?.getInt("chapterId") ?: return@composable
                val page = entry.arguments?.getInt("page") ?: 1
                ReaderScreen(
                    chapterId = chapterId,
                    startPage = page,
                    onExit = { nav.popBackStack() },
                )
            }
        }
    }
}

@Composable
private fun LeftRail(currentRoute: String?, onSelect: (TopDestination) -> Unit) {
    val c = AppTheming.colors
    Column(
        Modifier
            .width(76.dp)
            .fillMaxHeight()
            .background(c.bgElevated),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Spacer(Modifier.size(18.dp))
        Box(
            Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(11.dp))
                .background(c.accent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(BookGlyph, contentDescription = "Pepe Manga", tint = c.accentInk, modifier = Modifier.size(22.dp))
        }
        Spacer(Modifier.size(12.dp))
        TopDestination.entries.forEach { dest ->
            val selected = currentRoute == dest.route ||
                (dest == TopDestination.HOME && currentRoute?.startsWith("series") == true)
            RailButton(
                icon = dest.icon,
                label = dest.label,
                selected = selected,
                onClick = { onSelect(dest) },
            )
        }
        Spacer(Modifier.weight(1f))
    }
}
