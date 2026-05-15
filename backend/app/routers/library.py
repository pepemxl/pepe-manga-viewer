from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, scanner
from ..database import get_db

router = APIRouter(prefix="/api/library", tags=["library"])


def _series_summary(db: Session, s: models.Series) -> dict:
    chapter_count = (
        db.query(func.count(models.Chapter.id))
        .filter(models.Chapter.series_id == s.id)
        .scalar() or 0
    )
    finished = (
        db.query(func.count(models.Progress.id))
        .filter(models.Progress.series_id == s.id, models.Progress.finished == 1)
        .scalar() or 0
    )
    last = (
        db.query(func.max(models.Progress.read_at))
        .filter(models.Progress.series_id == s.id).scalar()
    )
    pct = int((finished / chapter_count) * 100) if chapter_count else 0
    return {
        "id": s.id, "title": s.title, "author": s.author,
        "description": s.description, "kind": s.kind, "direction": s.direction,
        "source_path": s.source_path, "format": s.format, "tags": s.tags,
        "shelf": s.shelf, "cover_url": s.cover_url,
        "chapter_count": chapter_count,
        "unread_count": max(chapter_count - finished, 0),
        "progress_pct": pct, "last_read_at": last,
        "added_at": s.added_at,
    }


@router.get("")
def list_library(
    shelf: Optional[str] = Query(default=None),
    kind: Optional[str] = Query(default=None),
    sort: str = Query(default="recent"),
    db: Session = Depends(get_db),
):
    q = db.query(models.Series)
    if shelf and shelf.lower() not in ("all", ""):
        q = q.filter(func.lower(models.Series.shelf) == shelf.lower())
    if kind:
        q = q.filter(models.Series.kind == kind)
    rows = q.all()
    items = [_series_summary(db, s) for s in rows]
    if sort == "title":
        items.sort(key=lambda x: x["title"].lower())
    elif sort == "progress":
        items.sort(key=lambda x: x["progress_pct"], reverse=True)
    else:  # recent
        items.sort(
            key=lambda x: x["last_read_at"] or x["added_at"] or datetime.min,
            reverse=True,
        )
    return {"items": items, "count": len(items)}


@router.get("/shelves")
def list_shelves(db: Session = Depends(get_db)):
    shelves = db.query(models.Shelf).all()
    out = []
    for s in shelves:
        if s.kind == "system":
            if s.name.lower() == "all":
                cnt = db.query(func.count(models.Series.id)).scalar() or 0
            else:
                cnt = (
                    db.query(func.count(models.Series.id))
                    .filter(func.lower(models.Series.shelf) == s.name.lower())
                    .scalar() or 0
                )
        else:
            cnt = 0
        out.append({"id": s.id, "name": s.name, "kind": s.kind, "count": cnt})
    return {"items": out}


def _source_to_dict(db: Session, r: models.Source) -> dict:
    cnt = db.query(func.count(models.Series.id)).filter(
        models.Series.source_id == r.id
    ).scalar() or 0
    return {
        "id": r.id, "path": r.path, "enabled": int(r.enabled),
        "last_scan_at": r.last_scan_at, "count": cnt,
    }


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    rows = db.query(models.Source).order_by(models.Source.id.asc()).all()
    return {"items": [_source_to_dict(db, r) for r in rows]}


class SourceIn(BaseModel):
    path: str
    scan: bool = True


@router.post("/sources", status_code=201)
def add_source(body: SourceIn, db: Session = Depends(get_db)):
    path = body.path.strip()
    if not path:
        raise HTTPException(400, "path required")
    p = Path(path)
    if not p.exists():
        raise HTTPException(400, f"path does not exist: {path}")
    if not p.is_dir():
        raise HTTPException(400, "path must be a directory")
    if db.query(models.Source).filter_by(path=str(p)).first():
        raise HTTPException(409, "source already exists")

    src = models.Source(path=str(p), enabled=1)
    db.add(src)
    db.commit()
    db.refresh(src)

    scanned = {"series": 0, "chapters": 0}
    if body.scan:
        scanned = scanner.commit(db, src.path)
        db.refresh(src)

    return {**_source_to_dict(db, src), "scanned": scanned}


class SourcePatch(BaseModel):
    enabled: Optional[bool] = None


@router.patch("/sources/{source_id}")
def update_source(source_id: int, body: SourcePatch, db: Session = Depends(get_db)):
    src = db.query(models.Source).get(source_id)
    if not src:
        raise HTTPException(404)
    if body.enabled is not None:
        src.enabled = 1 if body.enabled else 0
    db.commit()
    return _source_to_dict(db, src)


@router.delete("/sources/{source_id}")
def delete_source(source_id: int, db: Session = Depends(get_db)):
    src = db.query(models.Source).get(source_id)
    if not src:
        raise HTTPException(404)
    # Unlink any series pointing at this source — keep the series themselves.
    db.query(models.Series).filter_by(source_id=source_id).update(
        {"source_id": None}, synchronize_session=False
    )
    db.delete(src)
    db.commit()
    return {"ok": True}


@router.post("/sources/{source_id}/scan")
def scan_source(source_id: int, db: Session = Depends(get_db)):
    src = db.query(models.Source).get(source_id)
    if not src:
        raise HTTPException(404)
    result = scanner.commit(db, src.path)
    db.refresh(src)
    return {**_source_to_dict(db, src), **result}
