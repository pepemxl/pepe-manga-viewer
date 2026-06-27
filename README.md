# pepe-manga.read

Manga / manhwa / comic / book reader. A Vite + React web client, a native
Kotlin / Jetpack Compose Android client, and a React + Tauri desktop client all
talk to the same FastAPI backend.

## Stack

- **Frontend**: Vite + React — host port **8201**
- **Backend**: FastAPI + SQLAlchemy — host port **8202**
- **Database**: MySQL 8 — host port **8203** (→ container 3306)
- **Android client**: native Kotlin / Jetpack Compose ([`android_native/`](android_native/)) — consumes the same backend
- **Desktop client**: React + Vite + Tauri ([`desktop/`](desktop/)) — same "Manga Viewer V2" design as the Android app
- Web stack orchestrated via `docker compose`.

## Run

```bash
docker compose up --build
```

Then open <http://localhost:8201>. API docs at <http://localhost:8202/docs>.

The backend auto-seeds sample series on first boot (controlled by `SEED_SAMPLE=1`). Drop your own `.cbz` / `.cbr` / loose-image folders into `backend/sample_manga/` and hit **Import → Re-scan** in the UI.

## Reading content from outside the project folder

Docker containers can only see paths that have been bind-mounted in from the host. To point the app at a folder somewhere else on your machine:

```bash
cp .env.example .env
$EDITOR .env            # set HOST_MEDIA_DIR=/path/on/your/host
docker compose up -d    # restart picks up the new mount
```

That host folder is now visible inside the backend container at **`/host`** (read-only). In the UI, **Settings → Sources** → add `/host` (or any subfolder of it) — the folder browser there starts at `/host` so you can navigate visually.

## Android client

A native Kotlin / Jetpack Compose reader lives in [`android_native/`](android_native/).
It reimplements no backend logic — it's a pure client of the FastAPI backend
above and ships e-paper (mono) and color e-paper (Boox Kaleido) display modes.
Start the backend, then:

```bash
cd android_native
echo "sdk.dir=/path/to/Android/Sdk" > local.properties
./gradlew installDebug    # to a connected device / emulator
```

See [`android_native/README.md`](android_native/README.md) for the default
backend URL (`http://10.0.2.2:8202` from the emulator) and build details.

## Desktop client

A React + Vite + **Tauri** desktop port of the Android reader lives in
[`desktop/`](desktop/). It carries the same five-theme "Manga Viewer V2" design
(e-paper mono / color e-paper / dark / light / sepia) and the full reader UX.
Start the backend, then:

```bash
cd desktop
npm install
npm run tauri:dev    # native window; defaults to http://localhost:8202
```

`npm run tauri:build` produces a distributable. See
[`desktop/README.md`](desktop/README.md) for feature parity and details.

## Reader shortcuts

- `← / →` page prev / next (respects RTL)
- `shift + ← →` chapter prev / next
- `space` next page
- `F` fullscreen
- `B` bookmark
- `M` cycle reading mode
- `G` go to page
- `+ / -` zoom in / out · `0` reset zoom

## Project layout

```
backend/         FastAPI app, scanner, sample data
frontend/        Vite + React web client
android_native/  native Kotlin / Jetpack Compose Android client
desktop/         React + Vite + Tauri desktop client
mysql/init       MySQL schema bootstrap
Makefile         common dev workflows (`make help`)
make.bat         Windows equivalent of the Makefile (`make help`, `make android-apk`, …)
```

On Windows (no `make` installed), use the bundled `make.bat` from the repo root —
it mirrors the Makefile targets:

```bat
make help
make android-apk
```
