package read.pepe.manga.ui.common

/** Minimal async UI state. */
sealed interface Loadable<out T> {
    data object Loading : Loadable<Nothing>
    data class Success<T>(val data: T) : Loadable<T>
    data class Error(val message: String) : Loadable<Nothing>
}

inline fun <T> Loadable<T>.onSuccess(block: (T) -> Unit): Loadable<T> {
    if (this is Loadable.Success) block(data)
    return this
}

fun Throwable.toMessage(): String =
    message?.takeIf { it.isNotBlank() } ?: (this::class.simpleName ?: "Unknown error")
