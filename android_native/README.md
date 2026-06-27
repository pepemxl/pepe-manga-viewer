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
./gradlew assembleRelease        # → app/build/outputs/apk/release/ (signed if a keystore is set; see below)
./gradlew bundleRelease          # → app/build/outputs/bundle/release/app-release.aab (Play Store)
./gradlew installDebug           # to a connected device / emulator
```

From the repo root you can also use the Makefile shortcuts:

```bash
make android-apk                 # release APK (unsigned)
make android-apk-debug           # debug APK
```

Default backend URL is `http://10.0.2.2:8202` (the host loopback from the
Android emulator). Change it in **Settings → Server** for a physical device on
your LAN (e.g. `http://192.168.1.20:8202`). Cleartext HTTP to local hosts is
allowed via `res/xml/network_security_config.xml`.

Verified: `assembleDebug` and `assembleRelease` (R8 + lint-vital) both pass with
JDK 17, AGP 8.7.3, Gradle 8.11.1, compileSdk 35.

## Release signing

`assembleRelease` is signed when a keystore is configured, and falls back to an
unsigned APK otherwise. Credentials are read from `keystore.properties` (in this
folder, git-ignored) or, for CI, the matching environment variables
(`ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD`).

One-time setup (from the repo root):

```bash
make android-keystore            # generates release.jks + keystore.properties
#                                  override defaults: make android-keystore KEY_STOREPASS=… KEY_ALIAS=…
make android-apk                 # → app/build/outputs/apk/release/app-release.apk (signed)
make android-aab                 # → app/build/outputs/bundle/release/app-release.aab (signed; Play Store)
```

The same signing config applies to both, so `make android-aab` (Gradle's
`bundleRelease`) produces a signed App Bundle with no extra setup — that's the
format you upload to Google Play.

Or by hand:

```bash
cd android_native
keytool -genkeypair -v -keystore release.jks -alias pepe-manga \
    -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties   # then edit the values
./gradlew assembleRelease
```

`storeFile` may be absolute or relative to `android_native/`. The keystore and
`keystore.properties` are git-ignored — **never commit them**, and keep a backup
of the keystore (losing it means you can't ship updates under the same identity).

## Working offline

The reader keeps working when the backend is unreachable:

- **Page images** are cached local-first under
  `<localStorageDir>/<provider>/<manga>/<chapter>/` — `LocalPageFetcher` serves
  them from disk and only downloads (write-through) on a miss. Covers come from
  Coil's 256 MB disk cache, so ones you've seen still render.
- **Metadata** (library, series, chapter, dashboard) is cached as JSON under
  `<localStorageDir>/_meta/` by `MetadataCache`. `MangaRepository` is
  network-first with write-through and falls back to the cached copy on an
  `IOException` (no connectivity).
- **Reading progress** posted while offline is queued in `_meta/pending_progress`
  and replayed automatically on the next successful network call.

The cache root is **Settings → Local storage** (defaults to the app's external
files dir). Nothing here needs a runtime permission.
