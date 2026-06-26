# Pepe Manga — native Android reader

A native **Kotlin / Jetpack Compose** e-paper manga reader. It ports the
claude.ai/design project **"Manga Viewer V2"** ee [`design-reference/DESIGN.md`](design-reference/DESIGN.md))
and consumes the existing FastAPI backend in [`../backend`](../backend). No
backend logic is reimplemented here — the app is a pure frontend client.

## Headline feature: e-paper modes

The design ships two e-ink panel emulations, both wired up here and selectable
in **Settings → Display panel**:

- **E-paper (mono)** — `AppTheme.EPAPER`, the **default**. Max-contrast black/white,
  flat fills, hairline borders, no animation, page art rendered grayscale
  (`ColorMatrix` saturation 0 + ×1.16 contrast).
- **Color e-paper** — `AppTheme.KALEIDO` (Boox Kaleido 3). Muted color over
  warm-gray paper; page art desaturated to saturation 0.58 to mimic the CFA veil.

Plus `DARK`, `LIGHT`, `SEPIA` for completeness. Tokens live in
[`ui/theme/Tokens.kt`](app/src/main/java/read/pepe/manga/ui/theme/Tokens.kt) and
map 1:1 to the design's CSS custom properties.

## Stack

- Kotlin 2.1, Jetpack Compose (Material 3), Navigation Compose
- Coil 3 for page/cover images (shares the app's OkHttp client + disk cache)
- Retrofit + kotlinx.serialization for the JSON API
- DataStore for preferences (server URL, theme, reader defaults)
- ViewModel + StateFlow; lightweight manual DI (`di/ServiceLocator`)

## Screens

| Screen     | Source                                   | Backend |
|------------|------------------------------------------|---------|
| Home       | `ui/library/`                            | `GET /api/library` (+ shelves/languages) |
| Series     | `ui/series/`                             | `GET /api/series/{id}` |
| Reader     | `ui/reader/` (single/double/webtoon/strip, RTL/LTR, fit) | `GET /api/reader/chapter/{id}`, `/page/...`, `/neighbors/...`, `POST /api/chapters/{id}/progress` |
| Reading    | `ui/dashboard/`                          | `GET /api/dashboard/stats` + `/in-progress` |
| Settings   | `ui/settings/`                           | local |
| Add        | `ui/misc/AddScreen`                      | (import is server-side) |

## Build & run

The app talks to the FastAPI backend. Start it first (`docker compose up` from
the repo root — it listens on host port **8202**).

```bash
cd android_native
# point Gradle at your SDK (only needed if not already set)
echo "sdk.dir=/path/to/Android/Sdk" > local.properties
./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug           # to a connected device / emulator
```

Default backend URL is `http://10.0.2.2:8202` (the host loopback from the
Android emulator). Change it in **Settings → Server** for a physical device on
your LAN (e.g. `http://192.168.1.20:8202`). Cleartext HTTP to local hosts is
allowed via `res/xml/network_security_config.xml`.

Verified: `assembleDebug` and `assembleRelease` (R8 + lint-vital) both pass with
JDK 17, AGP 8.7.3, Gradle 8.11.1, compileSdk 35.
