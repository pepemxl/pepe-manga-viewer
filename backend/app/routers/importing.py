import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import scanner
from ..database import get_db

router = APIRouter(prefix="/api/import", tags=["import"])

MANGA_ROOT = os.getenv("MANGA_ROOT", "/manga")


class PreviewIn(BaseModel):
    path: Optional[str] = None


class CommitIn(BaseModel):
    path: str
    item_paths: Optional[list[str]] = None


@router.get("/browse")
def browse(path: Optional[str] = None):
    """List immediate folder children — used by the wizard's tree view."""
    base = Path(path) if path else Path(MANGA_ROOT)
    if not base.exists() or not base.is_dir():
        raise HTTPException(404, "path not found")
    children = []
    for p in sorted(base.iterdir(), key=lambda x: x.name.lower()):
        if p.name.startswith("."):
            continue
        children.append({
            "name": p.name,
            "path": str(p),
            "is_dir": p.is_dir(),
            "size": p.stat().st_size if p.is_file() else None,
        })
    return {"path": str(base), "parent": str(base.parent), "items": children}


@router.post("/preview")
def import_preview(body: PreviewIn):
    path = body.path or MANGA_ROOT
    items = scanner.preview(path)
    return {"path": path, "items": items}


@router.post("/commit")
def import_commit(body: CommitIn, db: Session = Depends(get_db)):
    if not Path(body.path).exists():
        raise HTTPException(404, "path not found")
    result = scanner.commit(db, body.path, body.item_paths)
    return {"ok": True, **result}


@router.post("/rescan")
def rescan_all(db: Session = Depends(get_db)):
    from .. import models
    total_series = 0
    total_chapters = 0
    for src in db.query(models.Source).all():
        r = scanner.commit(db, src.path)
        total_series += r["series"]
        total_chapters += r["chapters"]
    return {"ok": True, "series": total_series, "chapters": total_chapters}
