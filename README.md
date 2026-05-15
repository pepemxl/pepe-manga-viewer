# pepe-manga.read

Desktop manga / manhwa / comic / book reader.

## Stack

- **Frontend**: Vite + React — host port **8201**
- **Backend**: FastAPI + SQLAlchemy — host port **8202**
- **Database**: MySQL 8 — host port **8203** (→ container 3306)
- All three orchestrated via `docker compose`.

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

## Reader shortcuts

- `← / →` page prev / next (respects RTL)
- `shift + ← →` chapter prev / next
- `space` next page
- `F` fullscreen
- `B` bookmark
- `M` cycle reading mode
- `G` go to page

## Project layout

```
backend/   FastAPI app, scanner, sample data
frontend/  Vite + React
mysql/init MySQL schema bootstrap
```
