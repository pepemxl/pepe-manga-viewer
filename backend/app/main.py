import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, wait_for_db, SessionLocal
from .routers import series, chapters, reader, library, importing, dashboard, settings

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pepe-manga")

app = FastAPI(title="pepe-manga.read API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(library.router)
app.include_router(series.router)
app.include_router(chapters.router)
app.include_router(reader.router)
app.include_router(importing.router)
app.include_router(dashboard.router)
app.include_router(settings.router)


@app.on_event("startup")
def on_startup() -> None:
    wait_for_db()
    Base.metadata.create_all(engine)
    _migrate()

    if os.getenv("SEED_SAMPLE", "0") == "1":
        from . import models, seed
        db = SessionLocal()
        try:
            count = db.query(models.Series).count()
            if count == 0:
                log.info("Seeding sample manga…")
                seed.seed(db, os.getenv("MANGA_ROOT", "/manga"))
                log.info("Seed complete.")
            else:
                log.info("Skipping seed — %d series already present.", count)
        finally:
            db.close()


def _migrate() -> None:
    """Idempotent column adds — runs on every startup so old DBs catch up."""
    statements = [
        "ALTER TABLE series ADD COLUMN reading_mode VARCHAR(20) NULL",
        "ALTER TABLE series ADD COLUMN fit VARCHAR(20) NULL",
        (
            "CREATE TABLE IF NOT EXISTS series_collections ("
            "  series_id INT NOT NULL,"
            "  shelf_id  INT NOT NULL,"
            "  added_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,"
            "  PRIMARY KEY (series_id, shelf_id),"
            "  CONSTRAINT fk_sc_series FOREIGN KEY (series_id) REFERENCES series(id)  ON DELETE CASCADE,"
            "  CONSTRAINT fk_sc_shelf  FOREIGN KEY (shelf_id)  REFERENCES shelves(id) ON DELETE CASCADE"
            ")"
        ),
    ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.exec_driver_sql(stmt)
                log.info("applied: %s", stmt)
            except Exception:
                pass  # column already present


@app.get("/")
def root():
    return {"app": "pepe-manga.read", "ok": True}


@app.get("/health")
def health():
    return {"ok": True}
