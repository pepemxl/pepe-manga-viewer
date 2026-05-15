# pepe-manga.read

Desktop manga / manhwa / comic / book reader. Built from Claude Design wireframes — hand-sketched aesthetic, Architects Daughter + IBM Plex Mono fonts, warm rust accent.

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

## Surfaces

Following the locked wireframe set:

| Surface     | Variant | Notes                                         |
|-------------|---------|-----------------------------------------------|
| Library     | A       | Sidebar shelves + cover grid                  |
| Series      | A       | Cover left, chapter list right                |
| Reader      | A       | Single page RTL (toggleable to all 4 modes)   |
| Import      | B       | 3-step wizard                                 |
| Dashboard   | C       | Stats summary + in-progress list              |
| Settings    | A       | Sidebar nav + pane                            |

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
