package read.pepe.manga.ui.common

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import read.pepe.manga.ui.components.RetryButton
import read.pepe.manga.ui.theme.AppTheming

/** Renders loading / error / content for a [Loadable]. */
@Composable
fun <T> StateHost(
    state: Loadable<T>,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (T) -> Unit,
) {
    val c = AppTheming.colors
    when (state) {
        is Loadable.Loading -> Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            if (c.isEInk) Text("Loading…", color = c.ink3)
            else CircularProgressIndicator(color = c.accent)
        }
        is Loadable.Error -> Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.padding(32.dp),
            ) {
                Text("Couldn't reach the server", color = c.ink, textAlign = TextAlign.Center)
                Text(state.message, color = c.ink3, textAlign = TextAlign.Center)
                RetryButton(onClick = onRetry)
            }
        }
        is Loadable.Success -> content(state.data)
    }
}
