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


@app.get("/")
def root():
    return {"app": "pepe-manga.read", "ok": True}


@app.get("/health")
def health():
    return {"ok": True}
